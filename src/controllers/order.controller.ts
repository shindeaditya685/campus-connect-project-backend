import { ICustomRequest } from "./../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/order.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model";
import { Book, Status as BookStatus } from "../models/book.model";
import mongoose, { Types } from "mongoose";

const createOrder = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const { bookId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(bookId.toString())) {
    throw new ApiError(400, "Invalid BookId");
  }

  if (!userId) {
    throw new ApiError(404, "User not authenticated!");
  }

  const book = await Book.findById(bookId);
  if (!book) {
    throw new ApiError(404, "Book not found");
  }

  if (book.status !== BookStatus.Available) {
    throw new ApiError(400, "Book is not available to purchase");
  }

  if (book.userId.toString() === userId.toString()) {
    throw new ApiError(400, "You cannot purchase your own book");
  }

  const order = await Order.create({
    orderedByUserId: userId,
    bookId: book._id,
    orderStatus: OrderStatus.Pending,
  });

  // NOTE: Updating book status
  book.status = BookStatus.Sold;
  book.purchasedBy = userId;
  await book.save();

  // NOTE: Updating user purchased books
  await User.findByIdAndUpdate(userId, {
    $push: { booksPurchased: book._id },
  });

  res
    .status(201)
    .json(new ApiResponse(201, { order }, "Order created successfully"));
});

// const getUserOrders = asyncHandler(
//   async (req: ICustomRequest, res: Response) => {
//     const userId = req.user?._id;

//     if (!userId) {
//       throw new ApiError(401, "User not authenticated");
//     }

//     const orders = await Order.aggregate([
//       {
//         $match: {
//           orderedByUserId: new Types.ObjectId(userId),
//         },
//       },
//       {
//         $lookup: {
//           from: "books",
//           localField: "bookId",
//           foreignField: "_id",
//           as: "book",
//         },
//       },
//       {
//         $unwind: "$book",
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "book.userId",
//           foreignField: "_id",
//           as: "seller",
//         },
//       },
//       {
//         $unwind: "$seller",
//       },
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
//           },
//           orders: {
//             $push: {
//               orderId: "$_id", // Keeping orderId for cancellation
//               status: "$orderStatus",
//               book: {
//                 id: "$book._id",
//                 title: "$book.title",
//                 author: "$seller.fullName", // Assuming the seller is the author
//                 price: "$book.price",
//               },
//               seller: {
//                 fullName: "$seller.fullName",
//               },
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           status: { $arrayElemAt: ["$orders.status", 0] },
//           books: "$orders.book",
//           total: { $sum: "$orders.book.price" },
//           seller: { $arrayElemAt: ["$orders.seller", 0] },
//         },
//       },
//       {
//         $sort: { date: -1 },
//       },
//     ]);

//     res
//       .status(200)
//       .json(
//         new ApiResponse(200, { orders }, "User orders retrieved successfully")
//       );
//   }
// );

// // const getUserOrders = asyncHandler(
// //   async (req: ICustomRequest, res: Response) => {
// //     const userId = req.user?._id;

// //     if (!userId) {
// //       throw new ApiError(401, "User not authenticated");
// //     }

// //     const orders = await Order.aggregate([
// //       {
// //         $match: {
// //           orderedByUserId: new Types.ObjectId(userId),
// //         },
// //       },
// //       {
// //         $lookup: {
// //           from: "books",
// //           localField: "bookId",
// //           foreignField: "_id",
// //           as: "book",
// //         },
// //       },
// //       {
// //         $unwind: "$book",
// //       },
// //       {
// //         $lookup: {
// //           from: "users",
// //           localField: "book.userId",
// //           foreignField: "_id",
// //           as: "seller",
// //         },
// //       },
// //       {
// //         $unwind: "$seller",
// //       },
// //       {
// //         $group: {
// //           _id: {
// //             $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
// //           },
// //           orders: {
// //             $push: {
// //               id: "$_id",
// //               status: "$orderStatus",
// //               book: {
// //                 id: "$book._id",
// //                 title: "$book.title",
// //                 author: "$seller.fullName", // Assuming the seller is the author
// //                 price: "$book.price",
// //               },
// //               seller: {
// //                 fullName: "$seller.fullName",
// //               },
// //             },
// //           },
// //         },
// //       },
// //       {
// //         $project: {
// //           _id: 0,
// //           date: "$_id",
// //           status: { $arrayElemAt: ["$orders.status", 0] },
// //           books: "$orders.book",
// //           total: { $sum: "$orders.book.price" },
// //           seller: { $arrayElemAt: ["$orders.seller", 0] },
// //         },
// //       },
// //       {
// //         $sort: { date: -1 },
// //       },
// //     ]);

// //     // Add an id field to each order
// //     const ordersWithId = orders.map((order, index) => ({
// //       id: index + 1,
// //       ...order,
// //     }));

// //     res
// //       .status(200)
// //       .json(
// //         new ApiResponse(
// //           200,
// //           { orders: ordersWithId },
// //           "User orders retrieved successfully"
// //         )
// //       );
// //   }
// // );

// const cancelOrder = asyncHandler(async (req: ICustomRequest, res: Response) => {
//   const userId = req.user?._id;
//   const { orderId } = req.params;

//   if (!userId) {
//     throw new ApiError(401, "User not authenticated");
//   }

//   if (!mongoose.Types.ObjectId.isValid(orderId)) {
//     throw new ApiError(400, "Invalid Order ID");
//   }

//   const order = await Order.findById(orderId);

//   if (!order) {
//     throw new ApiError(404, "Order not found");
//   }

//   if (order.orderedByUserId.toString() !== userId.toString()) {
//     throw new ApiError(403, "Unauthorized to cancel this order");
//   }

//   if (order.orderStatus !== OrderStatus.Pending) {
//     throw new ApiError(400, "Order cannot be cancelled. Contact Seller");
//   }

//   // Update order status to 'Cancelled'
//   order.orderStatus = OrderStatus.Cancelled;
//   await order.save();

//   // Revert book status back to 'Available'
//   await Book.findByIdAndUpdate(order.bookId, {
//     status: BookStatus.Available,
//     purchasedBy: null, // Clear the purchasedBy field
//   });

//   // Remove the book from the user's purchased books
//   await User.findByIdAndUpdate(userId, {
//     $pull: { booksPurchased: order.bookId },
//   });

//   res
//     .status(200)
//     .json(new ApiResponse(200, { order }, "Order cancelled successfully"));
// });

const getUserOrders = asyncHandler(
  async (req: ICustomRequest, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "User not authenticated");
    }

    const orders = await Order.aggregate([
      {
        $match: {
          orderedByUserId: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "books",
          localField: "bookId",
          foreignField: "_id",
          as: "book",
        },
      },
      {
        $unwind: "$book",
      },
      {
        $lookup: {
          from: "users",
          localField: "book.userId",
          foreignField: "_id",
          as: "seller",
        },
      },
      {
        $unwind: "$seller",
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          orders: {
            $push: {
              orderId: "$_id", // Using orderId to maintain consistency
              status: "$orderStatus",
              book: {
                id: "$book._id",
                title: "$book.title",
                author: "$seller.fullName", // Assuming the seller is the author
                price: "$book.price",
              },
              seller: {
                fullName: "$seller.fullName",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          orders: "$orders",
          total: { $sum: "$orders.book.price" },
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    res
      .status(200)
      .json(
        new ApiResponse(200, { orders }, "User orders retrieved successfully")
      );
  }
);

const cancelOrder = asyncHandler(async (req: ICustomRequest, res: Response) => {
  const userId = req.user?._id;
  const { orderId } = req.params;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid Order ID");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.orderedByUserId.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to cancel this order");
  }

  if (order.orderStatus !== OrderStatus.Pending) {
    throw new ApiError(400, "Order cannot be cancelled. Contact Seller");
  }

  // Update order status to 'Cancelled'
  order.orderStatus = OrderStatus.Cancelled;
  await order.save();

  // Revert book status back to 'Available'
  await Book.findByIdAndUpdate(order.bookId, {
    status: BookStatus.Available,
    purchasedBy: null,
  });

  // Remove the book from the user's purchased books
  await User.findByIdAndUpdate(userId, {
    $pull: { booksPurchased: order.bookId },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { order }, "Order cancelled successfully"));
});

export { createOrder, getUserOrders, cancelOrder };
