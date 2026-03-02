import express from "express";
import { getAllUsers, updateUser } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/", protect, getAllUsers);
userRouter.put("/:id", protect, updateUser);

export default userRouter;
