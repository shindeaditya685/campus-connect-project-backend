import mongoose, { Schema, Document } from "mongoose";

export enum OrderStatus {
  Pending = "Pending",
  Shipped = "Shipped",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
}

interface IOrder extends Document {
  orderedByUserId: Schema.Types.ObjectId;
  bookId: Schema.Types.ObjectId;
  orderStatus: OrderStatus;
}

const orderSchema = new Schema<IOrder>(
  {
    orderedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Pending,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
