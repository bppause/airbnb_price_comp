import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";



const app = express();

// IMPORTANT for Render / cloud deploy
const PORT = process.env.PORT || 3000;

// Resolve paths (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/app-config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL || ""}";
    window.SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY || ""}";
  `);
});

// Middleware
app.use(express.json());

// ---- Serve static files (for HTML, config, etc) ----
app.use(express.static(__dirname));

// ---- Serve main app ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "morroskai_pricing_auth_full.html"));
});

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasToken: !!process.env.APIFY_TOKEN,
    hasSyncUrl: !!process.env.APIFY_SYNC_URL,
    environment: process.env.NODE_ENV || "local",
  });
});

// ---- Fetch Airbnb comps ----
app.post("/api/comps/search", async (req, res) => {
  try {
    console.log("👉 Fetching comps...");

    const { location } = req.body || {};

    if (!process.env.APIFY_SYNC_URL) {
      throw new Error("APIFY_SYNC_URL not set in .env");
    }

    const searchLocation =
      location || "Playa Manzanillo, Cartagena, Colombia";

    const response = await fetch(process.env.APIFY_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        location: searchLocation,
        maxItems: 10,
      }),
    });

    const raw = await response.json();
    console.log("RAW APIFY:", raw);

    // Normalize response
    let items = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw?.items && Array.isArray(raw.items)) {
      items = raw.items;
    } else if (raw?.data && Array.isArray(raw.data)) {
      items = raw.data;
    }

    if (!items.length) {
      console.log("❌ No listings returned from provider");

      return res.json({
        comps: [],
        search_summary: "No listings returned",
        market_avg_usd: null,
      });
    }

    // Map to your app format
    const comps = items.slice(0, 10).map((it, i) => ({
      name: it.name || it.title || `Listing ${i + 1}`,
      url: it.url || it.link || "",
      rate_usd:
        it.price?.amount ||
        it.price ||
        it.pricing?.rate ||
        null,
      rating: it.rating || it.stars || null,
      reviews: it.reviews || it.reviewsCount || null,
      found: true,
    }));

    const valid = comps.filter((c) => c.rate_usd);
    const avg = valid.length
      ? valid.reduce((s, c) => s + c.rate_usd, 0) / valid.length
      : null;

    res.json({
      comps,
      search_summary: `Live comps for ${searchLocation}`,
      market_avg_usd: avg,
    });
  } catch (err) {
    console.error("❌ ERROR:", err.message);

    res.status(500).json({
      error: true,
      message: err.message,
    });
  }
});

// ---- Optional: catch-all route (for SPA behavior if needed) ----
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "morroskai_pricing_auth_full.html"));
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("🔑 API key loaded:", !!process.env.APIFY_TOKEN);
  console.log("🔗 APIFY_SYNC_URL set:", !!process.env.APIFY_SYNC_URL);
});