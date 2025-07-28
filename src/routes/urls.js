import express from "express";
import { body } from "express-validator";
import authenticateToken from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import {
  createShortUrl,
  getMyUrls,
  updateUrl,
  deleteUrl,
  getUrlDetails,
  verifyUrlPassword,
} from "../controllers/urlsController.js";

const router = express.Router();

const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many requests, please try again after 15 minutes",
});

const passwordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many requests, please try again after 15 minutes",
});

// Create a short URL
// POST /api/urls/shorten
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
      .optional({ values: "null" })
      .isString()
      .withMessage("Description must be a string").escape(),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  createShortUrl
);

// Get all URLs for the authenticated user
// GET /api/urls/my-urls
router.get("/my-urls", authenticateToken, getMyUrls);

// Update a URL for the authenticated user
// PUT /api/urls/:id
router.put(
  "/:id",
  authenticateToken,
  [
    body("originalUrl").optional().isURL().withMessage("Invalid URL format"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    body("description")
      .optional({ values: "null" })
      .isString()
      .withMessage("Description must be a string").escape(),
    body("password")
      .optional({ checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  updateUrl
);

// Delete a URL for the authenticated user
// DELETE
router.delete("/:id", authenticateToken, deleteUrl);

// Get URL details (for frontend to check password status and description to on redirect page)
// GET /api/urls/url-details/:shortCode
router.get("/url-details/:shortCode", getUrlDetails);

// Password verification for protected URLs
// POST /api/urls/verify-password
router.post(
  "/verify-password",
  passwordVerifyLimiter,
  [
    body("shortCode")
      .isLength({ min: 1 })
      .withMessage("Short code is required"),
    body("password").isLength({ min: 1 }).withMessage("Password is required"),
  ],
  verifyUrlPassword
);
export default router;
