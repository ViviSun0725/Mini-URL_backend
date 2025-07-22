import express from "express";
import { query, validationResult } from "express-validator";
import fetch from "node-fetch";
import { load } from "cheerio";

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
      const response = await fetch(url);
      const html = await response.text();
      const $ = load(html);

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
