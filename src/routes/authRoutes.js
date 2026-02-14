import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const authRouter = express.Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginLimiter, loginUser);

export default authRouter;
