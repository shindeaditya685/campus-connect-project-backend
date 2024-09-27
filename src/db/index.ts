import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connectToDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(
      `MONGODB connected!! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection failed!", error);
    process.exit(1);
  }
};

export default connectToDB;
