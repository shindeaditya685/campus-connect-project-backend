import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { IUser, User } from "../models/user.model";
import { deleteImageByPublicId, uploadOnCloudinary } from "../utils/cloudinary";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { options } from "../utils/options";
import { IDecodeToken, ICustomRequest } from "../middlewares/auth.middleware";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    username,
    email,
    fullName,
    description,
    address,
    password,
    contactNumber,
  } = req.body;

  if (
    [username, email, fullName, address, contactNumber, password].some(
      (field) => field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(
      400,
      "User already exists with given email or username!"
    );
  }

  const avatarLocalPath = req.file?.path;

  console.log("avatarLocalPath = ", avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is missing!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar!");
  }

  const user = await User.create({
    username,
    email,
    fullName,
    avatar: avatar.url,
    contactNumber,
    password,
    address,
    description,
    avatarPublicId: avatar.public_id,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user.");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const generateAccessAndRefreshTokens = async (
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  // Step 1: Extract data from request body
  const { email, username, password } = req.body;

  console.log("Login attempt:", {
    email,
    username,
    password: password ? "[REDACTED]" : undefined,
  });

  // Step 2: Validate username or email
  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // Step 3: Find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  }).exec();

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Step 4: Check if the password is valid
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Step 5: Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id.toString()
  );

  // Step 6: Send cookies and response
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .exec();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req: ICustomRequest, res: Response) => {
  if (!req.user?._id) {
    throw new ApiError(400, "You are not logged in!");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out!"));
});

const refreshAccessToken = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    try {
      const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

      if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthoruzed request!");
      }

      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      ) as IDecodeToken;

      const user = (await User.findById(decodedToken?._id)) as IUser;

      if (!user) {
        throw new ApiError(401, "Invalid refresh token!");
      }

      if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or user !");
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessAndRefreshTokens(user?._id);

      return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .json(
          new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken },
            "Access token refreshed!"
          )
        );
    } catch (error) {
      throw new ApiError(401, (error as string) || "Invalid refresh token!");
    }
  }
);

const changeCurrentPassword = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (
      [oldPassword, newPassword, confirmPassword].some(
        (field) => field.trim() === ""
      )
    ) {
      throw new ApiError(401, "All fields are required!");
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(401, "New passwords do not match!");
    }

    const user = (await User.findById(req?.user?._id)) as IUser;
    const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully!"));
  }
);

const getCurrentUser = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const currentUser = req?.user;

    if (!currentUser) {
      throw new ApiError(401, "No user found!");
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, currentUser, "Current User fetch successfully!")
      );
  }
);

const updateAccountDetails = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const { fullName, username, email, address, contactNumber, description } =
      req.body;

    if (
      !fullName ||
      !email ||
      !address ||
      !contactNumber ||
      !description ||
      !username
    ) {
      throw new ApiError(401, "Fields must not be empty!");
    }

    const user = await User.findByIdAndUpdate(
      req?.user?._id,
      {
        $set: {
          fullName,
          email,
          address,
          contactNumber,
          description,
          username,
        },
      },
      {
        new: true,
      }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user as object,
          "Account details updated successfully!"
        )
      );
  }
);

const updateUserAvatar = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is missing!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
      throw new ApiError(400, "Error while uploading avatar!");
    }

    const avatarPublicId = req.user?.avatarPublicId;

    await deleteImageByPublicId(avatarPublicId);

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar?.url,
          avatarPublicId: avatar?.public_id,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(
        new ApiResponse(200, user as object, "Avatar updated successfully!")
      );
  }
);

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
};
