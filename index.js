import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";

dotenv.config();
const app = express();

connectDB();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(helmet());

app.get("/", (req, res) => {
  res.status(200).json({ message: `VHub API is running.. ${Date.now()}` });
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
