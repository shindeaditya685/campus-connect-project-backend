import dotenv from "dotenv";
import { app } from "./app";
import connectToDB from "./db";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT;

connectToDB()
  .then(() => {
    app.on("error", (error) => {
      console.log(`Error while creating app ${error}`);
    });
    app.listen(port || 4000, () => {
      console.log(`Server is running at port : ${port}`);
    });
  })
  .catch((error) => {
    console.log("MONGODB connection failed!!!  ", error);
  });
