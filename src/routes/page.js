import express from "express";
import { query } from "express-validator";
import { getPageDetails } from "../controllers/pageController.js";

const router = express.Router();

// GET /api/page/page-detais
router.get(
  "/page-details",
  query("url").isURL().withMessage("Invalid URL format").escape(),
  getPageDetails
);

export default router;

/**
 * TODO:
 * Move this functionality to frontend. This doesn't need a API call to backend.
 */
