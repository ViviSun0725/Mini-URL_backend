import getPrismaClient from "../configs/prisma.js";
const prisma = getPrismaClient();

const frontendUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

export const redirectURL = async (req, res) => {
  const { shortCode } = req.params;
  try {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ shortCode: shortCode }, { customShortCode: shortCode }],
      },
    });

    if (!url || !url.isActive) {
      return res.status(404).send("URL not found or inactive");
    }

    if (url.password) {
      // Redirect to frontends's protected link page
      return res.redirect(`${frontendUrl}/protected-link/${shortCode}`);
    }
    // Basic validation for originalUrl before redirection to prevent open redirect vulnerabilities. should be expanded
    try {
      const parsedUrl = new URL(url.originalUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid URL protocol");
      }
    } catch (err) {
      console.error("Invalid originalUrl for redirection:", err);
      return res.status(400).json({ error: "Invalid URL for redirection" });
    }
    res.redirect(`${frontendUrl}/${shortCode}`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Invalid URL for redirection" });
  }
}