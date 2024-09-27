import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createOrder,
  getUserOrders,
  cancelOrder,
} from "../controllers/order.controller";

const router = Router();

router.route("/place-order/:bookId").post(verifyJWT, createOrder);
router.route("/get-user-orders").get(verifyJWT, getUserOrders);
router.route("/cancel-order/:orderId").post(verifyJWT, cancelOrder);

export default router;
