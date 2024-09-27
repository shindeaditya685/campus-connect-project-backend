import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface ICustomRequest extends Request {
  user?: typeof User.prototype; // Or you can create a proper User type
}

export interface IDecodeToken extends JwtPayload {
  _id: string;
}

export const verifyJWT = asyncHandler(
  async (req: ICustomRequest, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer", "").trim();

      if (!token) {
        throw new ApiError(401, "Unauthorized request!");
      }

      const decodeToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as IDecodeToken;

      const user = await User.findById(decodeToken?._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        // TODO: discuss about frontend
        throw new ApiError(401, "Invalid Access Token!");
      }

      req.user = user;
      next();
    } catch (error) {
      throw new ApiError(401, (error as string) || "Invalid access Token");
    }
  }
);
