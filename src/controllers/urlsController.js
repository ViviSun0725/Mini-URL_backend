import { validationResult } from "express-validator";
import { customAlphabet } from "nanoid";
import bcrypt from "bcrypt";
import getPrismaClient from "../configs/prisma.js";
const prisma = getPrismaClient();

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 7);

export const createShortUrl = async (req, res) => {
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

    res.status(200).json({
      message: "URL shortened successfully",
      shortUrl: shortUrl,
      id: newUrl.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMyUrls = async (req, res) => {
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
};

export const updateUrl = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors for URL update:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { originalUrl, isActive, description, password } = req.body;

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

    let hashedPassword = url.password;
    if (password !== undefined) {
      // Check if password field was sent in the request
      if (password) {
        // If password is not empty, hash and update
        hashedPassword = await bcrypt.hash(password, 10);
      } else {
        // If password is explicitly empty, set to null (remove password)
        hashedPassword = null;
      }
    }

    const updatedUrl = await prisma.url.update({
      where: { id: url.id },
      data: {
        originalUrl: originalUrl || url.originalUrl,
        description: description !== undefined ? description : url.description,
        isActive: isActive !== undefined ? isActive : url.isActive,
        password: hashedPassword,
      },
    });

    res.json({ message: "URL updated successfully", url: updatedUrl });
  } catch (err) {
    console.error("Error updating URL:", err);
    res.status(500).json({ error: "Server error during URL update." });
  }
};

export const deleteUrl = async (req, res) => {
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
};

export const getUrlDetails = async (req, res) => {
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

    const response = {
      requiresPassword: !!url.password,
      description: url.description,
    };
    if (response.requiresPassword === false) {
      response.originalUrl = url.originalUrl;
    }
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const verifyUrlPassword = async (req, res) => {
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
};
