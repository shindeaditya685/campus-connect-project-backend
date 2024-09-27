import mongoose from "mongoose";
import { Response, Request } from "express";
import { Book } from "../models/book.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { asyncHandler } from "../utils/asyncHandler";
import { ICustomRequest } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
import { Status as BookStatus } from "../models/book.model";
import { userInfo } from "os";

const registerBook = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const {
      title,
      educationLevel,
      specificStandard,
      instituteName,
      bookCondition,
      description,
      price,
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(404, "User not authenticated!");
    }

    if (
      [
        title,
        educationLevel,
        specificStandard,
        instituteName,
        bookCondition,
        price,
      ].some((field) => !field?.trim())
    ) {
      throw new ApiError(400, "All fields are required!");
    }

    const booksImagesLocalPath = req.files as Express.Multer.File[] | undefined;

    if (!booksImagesLocalPath || booksImagesLocalPath.length === 0) {
      throw new ApiError(400, "At least one book image is required!");
    }

    // if (booksImagesLocalPath || booksImagesLocalPath.length > 3) {
    //   throw new ApiError(400, "Images must be less than three!");
    // }

    const uploadedImages = await Promise.all(
      booksImagesLocalPath.map((file) => uploadOnCloudinary(file.path))
    );

    let imagesLinks = uploadedImages.map((image) => image?.url);

    const book = await Book.create({
      userId: req?.user?._id,
      title,
      educationLevel,
      specificStandard,
      instituteName,
      bookCondition,
      description,
      images: imagesLinks,
      price,
    });

    await User.findByIdAndUpdate(userId, {
      $push: { booksToSell: book._id },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, book, "Book registered successfully!"));
  }
);

const getBookById = asyncHandler(async (req: Request, res: Response) => {
  const { bookId } = req.params;

  if (!bookId) {
    throw new ApiError(404, "Book id not found!");
  }

  const book = await Book.findById(bookId);

  if (!book) {
    throw new ApiError(404, "Book not found!");
  }

  return res.status(200).json(new ApiResponse(200, book, "Book found!"));
});

const getBooksByUserId = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "User not authenticated!");
  }

  const books = await Book.find({ userId }).lean();

  if (!books || books.length === 0) {
    throw new ApiError(404, "Books not found!");
  }

  res.status(200).json(new ApiResponse(200, books, "Books found!"));
});

const getAllAvailableBooks = asyncHandler(
  async (req: Request, res: Response) => {
    const books = await Book.aggregate([
      {
        $match: { status: "Available" },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "seller",
        },
      },
      {
        $unwind: "$seller",
      },
      {
        $project: {
          _id: 1,
          title: 1,
          images: 1,
          instituteName: 1,
          price: 1,
          bookCondition: 1,
          status: 1,
          educationLevel: 1,
          specificStandard: 1,
          description: 1,
          seller: {
            _id: "$seller._id",
            username: "$seller.username",
            fullName: "$seller.fullName",
            avatar: "$seller.avatar",
          },
        },
      },
    ]);

    if (!books || books.length === 0) {
      throw new ApiError(404, "No available books found!");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, books, "Available books found!"));
  }
);

const getAllSoldBooks = asyncHandler(async (req: Request, res: Response) => {
  const books = await Book.find({ status: "Sold" });

  if (!books || books.length === 0) {
    throw new ApiError(404, "No sold books found!");
  }

  return res.status(200).json(new ApiResponse(200, books, "Sold books found!"));
});

const buyBook = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const { bookId } = req.params;

  if (!bookId) {
    throw new ApiError(404, "Book Id not found!");
  }

  const book = await Book.findById(bookId);

  if (!book) {
    throw new ApiError(404, "Book not found!");
  }

  // Note: Ensure that the user trying to buy the book is not the owner
  if (book.userId.toString() === req.user?._id.toString()) {
    throw new ApiError(400, "You cannot purchase your own book!");
  }

  // Update book status to "Sold" and set the purchaser's ID
  const updatedBook = await Book.findByIdAndUpdate(
    bookId,
    {
      $set: {
        status: "Sold",
        purchasedBy: req.user?._id,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedBook },
        "You have purchased this book successfully!"
      )
    );
});

const updateBookDetails = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const {
      title,
      educationLevel,
      specificStandard,
      instituteName,
      bookCondition,
      description,
      price,
    } = req.body;

    const { bookId } = req.params;

    if (
      [
        title,
        educationLevel,
        specificStandard,
        instituteName,
        bookCondition,
        description,
      ].some((field) => !field || field.trim() === "") ||
      price === undefined ||
      price === null
    ) {
      throw new ApiError(400, "All fields are required!");
    }

    const book = await Book.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(bookId) } },
      {
        $project: {
          userIdMatches: {
            $eq: ["$userId", new mongoose.Types.ObjectId(req.user?._id)],
          },
        },
      },
    ]);

    if (!book.length) {
      throw new ApiError(404, "Book not found for the given bookId!");
    }

    if (!book[0].userIdMatches) {
      throw new ApiError(
        403,
        "You cannot update details of someone else's book"
      );
    }

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      {
        $set: {
          title,
          educationLevel,
          specificStandard,
          instituteName,
          bookCondition,
          description,
          price,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedBook as object,
          "Book details updated successfully!"
        )
      );
  }
);

const deleteBookById = asyncHandler(
  async (req: ICustomRequest, res, Response) => {
    const userId = req.user?._id;
    const { bookId } = req.params;

    if (!userId) {
      throw new ApiError(404, "User not authenticated!");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found!");
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new ApiError(404, "Invalid BookId!");
    }

    const book = await Book.findOne({ _id: bookId, userId });

    if (!book) {
      throw new ApiError(404, "Book not found or unauthorized action!");
    }

    if (book.status === BookStatus.Sold) {
      throw new ApiError(
        400,
        "Book is already sold cannot delete from records!."
      );
    }

    await Book.findByIdAndDelete(bookId);

    console.log("Till here");

    await User.findByIdAndUpdate(userId, {
      $pull: { booksToSell: bookId },
    });

    // NOTE: alternative way
    // user.booksToSell = user.booksToSell.filter(
    //   (id) => id.toString() !== bookId
    // );
    // await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, book, "Book deleted successfully!"));
  }
);

export {
  registerBook,
  getBookById,
  getAllAvailableBooks,
  getAllSoldBooks,
  buyBook,
  updateBookDetails,
  deleteBookById,
  getBooksByUserId,
};
