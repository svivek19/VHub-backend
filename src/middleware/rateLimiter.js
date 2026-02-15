import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
