export const getPageDetails = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { url } = req.query;

  try {
    const $ = await cheerio.fromURL(url);

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
};
