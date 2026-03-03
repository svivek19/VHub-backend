import express from "express";
import {
  deleteUser,
  getAllUsers,
  updateUser,
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/", protect, getAllUsers);
userRouter.put("/:id", protect, updateUser);
userRouter.delete("/:id", protect, deleteUser);

export default userRouter;
