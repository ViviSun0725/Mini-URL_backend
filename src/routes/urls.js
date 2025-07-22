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

// Create a short URL
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
    const { originalUrl, customShortCode, password, description, isActive } =
      req.body;

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

// Delete a URL for the authenticated user
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const url = await prisma.url.findUnique({
      where: { id: parseInt(id) },
    });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    if (url.userId !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.url.delete({
      where: { id: url.id },
    });

    res.json({ message: "URL deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get all URLs for the authenticated user
router.get("/my-urls", authenticateToken, async (req, res) => {
  try {
    const urls = await prisma.url.findMany({
      where: {
        userId: req.user.userId,
      },
      select: {
        id: true,
        originalUrl: true,
        shortCode: true,
        customShortCode: true,
        description: true,
        isActive: true,
        createdAt: true,
        password: true,
      },
    });

    const responseUrls = urls.map(({ password, ...rest }) => {
      return {
        ...rest,
        requiresPassword: !!password, // Indicate if the URL is password-protected
      };
    });
    res.json(responseUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get URL details (for frontend to check password status and description)
router.get("/url-details/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  try {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode: shortCode }, { customShortCode: shortCode }],
      },
      select: {
        originalUrl: true,
        password: true,
        description: true,
        isActive: true,
      },
    });

    if (!url || !url.isActive) {
      return res.status(404).json({ error: "URL not found or inactive." });
    }

    res.status(200).json({
      originalUrl: url.originalUrl,
      requiresPassword: !!url.password,
      description: url.description,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Password verification for protected URLs
router.post(
  "/verify-password",
  passwordVerifyLimiter,
  [
    body("shortCode")
      .isLength({ min: 1 })
      .withMessage("Short code is required"),
    body("password").isLength({ min: 1 }).withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shortCode, password } = req.body;

    try {
      const url = await prisma.url.findFirst({
        where: {
          OR: [{ shortCode: shortCode }, { customShortCode: shortCode }],
        },
      });

      if (!url || !url.password) {
        return res
          .status(404)
          .send("URL not found or does not require a password");
      }

      const isPasswordValid = await bcrypt.compare(password, url.password);
      if (isPasswordValid) {
        res.json({ originalUrl: url.originalUrl });
      } else {
        res.status(401).send("Incorrect password");
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
export default router;
