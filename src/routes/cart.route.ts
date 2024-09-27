import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
} from "../controllers/cart.controller";

const router = Router();

router.route("/add-to-cart/:bookId").post(verifyJWT, addToCart);
router.route("/remove-from-cart/:bookId").patch(verifyJWT, removeFromCart);
router.route("/get-cart").get(verifyJWT, getCart);
router.route("/clear-cart").post(verifyJWT, clearCart);

export default router;
