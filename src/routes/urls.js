import express from "express";
import { body, validationResult } from "express-validator";
import { customAlphabet } from "nanoid";
import bcrypt from "bcrypt";
import prisma from "../configs/prisma.js";
import dotenv from "dotenv";
import authenticateToken from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

dotenv.config();
const nanoid = customAlphabet("1234567890abcdef", 7);

const router = express.Router();

const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many requests, please try again after 15 minutes",
});

const passwordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many requests, please try again after 15 minutes",
});

// URL Shortening
router.post(
  "/shorten",
  authenticateToken,
  shortenLimiter,
  [
    body("originalUrl").isURL().withMessage("Invalid URL format"),
    body("customShortCode")
      .optional()
      .isLength({ min: 3, max: 10 })
      .withMessage("Custom short code must be between 3 and 10 characters"),
    body("description")
      .optional()
      .isString()
      .withMessage("Description must be a string"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { originalUrl, customShortCode, password, description, isActive } = req.body;

    let finalShortCode = customShortCode;
    if (customShortCode) {
      const existingUrl = await prisma.url.findUnique({
        where: { shortCode: customShortCode },
      });
      if (existingUrl) {
        return res
          .status(409)
          .json({ error: "Custom short code already in use." });
      }
    } else {
      finalShortCode = nanoid();
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    try {
      const userId = req.user.userId; 

      // Check if custom short code already exists for the user
      if (customShortCode) {
        const existingUrl = await prisma.url.findUnique({
          where: { shortCode: customShortCode, userId },
        });
        if (existingUrl) {
          return res
            .status(409)
            .json({ error: "Custom short code already in use." });
        }
      }

      const newUrl = await prisma.url.create({
        data: {
          originalUrl,
          shortCode: finalShortCode,
          customShortCode: customShortCode || null,
          password: hashedPassword,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          userId: req.user.userId,
        },
      });
      const baseUrl =
        process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const shortUrl = `${baseUrl}/${newUrl.shortCode}`;

      res
        .status(200)
        .json({ message: "URL shortened successfully", shortUrl: shortUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
