import express, { Request, Response } from "express";

const router = express.Router();

function formatUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return "https://" + url;
  }
  return url;
}

router.post("/", async (req: Request, res: Response) => {
  console.log(" Incoming Body:", req.body);

  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      console.log("❌ Invalid URL in request");
      return res.status(400).json({ error: "Invalid url" });
    }

    const formatted = formatUrl(url.trim());
    console.log(" Formatted URL:", formatted);

    // Validate URL
    try {
      new URL(formatted);
    } catch {
      console.log("❌ URL failed validation");
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const apiKey = process.env.PAGESPEED_API_KEY;
    console.log(" API KEY exists?", !!apiKey);

    if (!apiKey) {
      console.log("❌ Missing PAGESPEED_API_KEY");
      return res.status(500).json({ error: "Server missing API key" });
    }

    const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      formatted
    )}&category=PERFORMANCE&category=SEO&category=BEST_PRACTICES&category=ACCESSIBILITY&strategy=DESKTOP&key=${apiKey}`;

    console.log(" Calling:", endpoint);

    const response = await fetch(endpoint);
  

    if (!response.ok) {
      const text = await response.text();
      console.log("❌ Google Pagespeed Error:", text);

      return res.status(response.status).json({
        error: "Pagespeed API error",
        details: text,
      });
    }

    const data = await response.json();
    console.log(" Pagespeed Success");

    // --------------------------
    // ✅ MINIMAL CHANGE SECTION
    // --------------------------
    const lighthouse = data.lighthouseResult;

    const normalized = {
      performance: lighthouse?.categories?.performance?.score ?? 0,
      seo: lighthouse?.categories?.seo?.score ?? 0,
      accessibility: lighthouse?.categories?.accessibility?.score ?? 0,
      bestPractices: lighthouse?.categories?.["best-practices"]?.score ?? 0,
      pwa: lighthouse?.categories?.pwa?.score ?? 0,

      audits: {
        fcp: lighthouse?.audits?.["first-contentful-paint"]?.displayValue,
        lcp: lighthouse?.audits?.["largest-contentful-paint"]?.displayValue,
        cls: lighthouse?.audits?.["cumulative-layout-shift"]?.displayValue,
        tbt: lighthouse?.audits?.["total-blocking-time"]?.displayValue,
        speedIndex: lighthouse?.audits?.["speed-index"]?.displayValue,
      }
    };
    // --------------------------

    return res.json({ url: formatted, normalized });
  } catch (err) {
    console.error(" Uncaught Server Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
