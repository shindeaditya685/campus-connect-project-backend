import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  avatarPublicId: string;
  address: string;
  description: string;
  contactNumber: string;
  booksToSell: mongoose.Schema.Types.ObjectId[]; // Reference to books
  booksPurchased: mongoose.Schema.Types.ObjectId[];
  password: string;
  refreshToken: string;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  isPasswordCorrect(password: string): Promise<boolean>;
  save({}): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    avatarPublicId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    booksToSell: [
      {
        type: Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    booksPurchased: [
      {
        type: Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as string,
    }
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string,
    }
  );
};

export const User = mongoose.model<IUser>("User", userSchema);
