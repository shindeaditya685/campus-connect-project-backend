import mongoose, { Schema, Document } from "mongoose";

interface ICart extends Document {
  userId: Schema.Types.ObjectId;
  books: Schema.Types.ObjectId[];
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    books: [
      {
        type: Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
  },
  { timestamps: true }
);

export const Cart = mongoose.model<ICart>("Cart", cartSchema);
