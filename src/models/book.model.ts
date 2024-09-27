import mongoose, { Schema, Document } from "mongoose";

enum EducationLevel {
  Elementary = "Elementary",
  MiddleSchool = "Middle School",
  HighSchool = "High School",
  Undergraduate = "Undergraduate",
  Postgraduate = "Postgraduate",
}

enum BookCondition {
  Mint = "Mint",
  LikeNew = "Like New",
  NearFine = "Near Fine",
  Fine = "Fine",
  VeryGood = "Very Good",
  Good = "Good",
  Fair = "Fair",
  Poor = "Poor",
}

export enum Status {
  Available = "Available",
  Sold = "Sold",
}

interface IBook extends Document {
  userId: Schema.Types.ObjectId; // NOTE: userId means the user who wants to sell his/her book.
  title: string;
  educationLevel: EducationLevel;
  specificStandard: string;
  instituteName: string;
  bookCondition: BookCondition;
  description: string;
  images: string[];
  price: number;
  purchasedBy: Schema.Types.ObjectId | null;
  status: Status | undefined;
}

const bookSchema = new Schema<IBook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    educationLevel: {
      type: String,
      enum: Object.values(EducationLevel),
      required: true,
    },
    instituteName: {
      type: String,
      required: true,
    },
    bookCondition: {
      type: String,
      enum: Object.values(BookCondition),
      required: true,
    },
    specificStandard: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    images: {
      type: [String],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    purchasedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(Status),
      default: "Available",
    },
  },
  { timestamps: true }
);

export const Book = mongoose.model<IBook>("Book", bookSchema);
