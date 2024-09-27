import { Cart } from "../models/cart.model";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ICustomRequest } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
import { Book } from "../models/book.model";
import mongoose from "mongoose";

const addToCart = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const { bookId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new ApiError(400, "Invalid book ID");
  }

  const [user, book] = await Promise.all([
    User.findById(userId).exec(),
    Book.findById(bookId).exec(),
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!book) {
    throw new ApiError(404, "Book not found");
  }

  if (book.userId.toString() === userId.toString()) {
    throw new ApiError(400, "You cannot add your own book to the cart");
  }

  if (book.status !== "Available") {
    throw new ApiError(400, "Book is not available for purchase");
  }

  const cart = await Cart.findOneAndUpdate(
    { userId },
    { $addToSet: { books: new mongoose.Types.ObjectId(bookId) } },
    { upsert: true, new: true }
  ).exec();

  res
    .status(200)
    .json(new ApiResponse(200, { cart }, "Book added to cart successfully"));
});

// const removeFromCart = asyncHandler(
//   async (req: ICustomRequest, res: Response) => {
//     const { bookId } = req.params;
//     const userId = req.user?._id;

//     if (!userId) {
//       throw new ApiError(404, "User not authenticated!");
//     }

//     if (!mongoose.Types.ObjectId.isValid(bookId)) {
//       throw new ApiError(400, "Invalid book ID");
//     }

//     const cart = await Cart.findOne({ userId });

//     if (!cart) {
//       throw new ApiError(404, "Cart not found");
//     }

//     await Cart.findOneAndUpdate({ userId }, { $pull: { books: bookId } });

//     // NOTE: Alternative way
//     // cart.books = cart.books.filter((id) => id.toString() !== bookId);
//     // await cart.save();

//     res
//       .status(200)
//       .json(
//         new ApiResponse(200, { cart }, "Book removed from cart successfully")
//       );
//   }
// );

const removeFromCart = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const { bookId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new ApiError(400, "Invalid book ID");
    }

    // Find the cart and remove the book in one operation
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { books: bookId } },
      { new: true }
    );

    if (!updatedCart) {
      throw new ApiError(404, "Cart not found or book not in cart");
    }

    // Fetch the updated cart with populated book details
    const populatedCart = await Cart.findById(updatedCart._id).populate(
      "books"
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { cart: populatedCart },
          "Book removed from cart successfully"
        )
      );
  }
);

const getCart = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const cart = await Cart.findOne({ userId })
    .populate({
      path: "books",
      select: "-__v",
    })
    .lean()
    .exec();

  if (!cart) {
    return res
      .status(200)
      .json(new ApiResponse(200, { cart: null }, "Cart is empty"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, { cart }, "Cart retrieved successfully"));
});

const clearCart = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const user = req.user;

  if (!user?._id) {
    throw new ApiError(401, "User not authenticated");
  }

  const cart = await Cart.findOneAndUpdate(
    { userId: user?._id },
    {
      $set: {
        books: [],
      },
    },
    { new: true, runValidators: true }
  );

  if (cart?.books.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, { cart: null }, "Cart is already empty"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, { cart }, "Cart cleared successfully"));
});

export { addToCart, removeFromCart, getCart, clearCart };
