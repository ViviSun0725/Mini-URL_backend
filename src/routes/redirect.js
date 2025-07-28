import express from "express";
import { redirectURL } from "../controllers/redirectController.js";

const router = express.Router();
// Redirect from short code to original URL
// GET /:shortCode
router.get("/:shortCode", redirectURL);

export default router;
