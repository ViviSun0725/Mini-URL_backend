import express from "express";
import { query, validationResult } from "express-validator";
import * as cheerio from 'cheerio';

const router = express.Router();

router.get(
  "/page-details",
  query("url").isURL().withMessage("Invalid URL format"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { url } = req.query;

    try {
      const $ = await cheerio.fromURL(url)

      const title = $("title").text();
      const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content");

      res.json({
        title,
        description,
      });
    } catch (error) {
      console.error("Error fetching page details:", error);
      return res.status(500).json({ error: "Failed to fetch page details" });
    }
  }
);

export default router;

/**
 * TODO:
 * Move this functionality to frontend. This doesn't need a API call to backend.
 */
