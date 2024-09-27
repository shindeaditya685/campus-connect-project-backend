import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
import {
  getBookById,
  registerBook,
  getAllAvailableBooks,
  getAllSoldBooks,
  buyBook,
  updateBookDetails,
  deleteBookById,
  getBooksByUserId,
} from "../controllers/book.controller";

const router = Router();

router
  .route("/register-book")
  .post(upload.array("images", 3), verifyJWT, registerBook);

router.route("/get-book/:bookId").get(verifyJWT, getBookById);
router.route("/get-user-books/:userId").get(verifyJWT, getBooksByUserId);
router.route("/get-all-available-books").get(verifyJWT, getAllAvailableBooks);
router.route("/get-all-sold-books").get(verifyJWT, getAllSoldBooks);
router.route("/buy-book/:bookId").patch(verifyJWT, buyBook);
router
  .route("/update-book-details/:bookId")
  .patch(verifyJWT, updateBookDetails);
router.route("/delete-book/:bookId").delete(verifyJWT, deleteBookById);

export default router;
