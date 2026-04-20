import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

// 👉 change this if you rename HTML
const HTML_FILE = process.env.HTML_FILE || "morroskai_pricing_auth_autosave_merged.html";

// =====================================================
// 🔐 SUPABASE CONFIG (served to browser)
// =====================================================
app.get("/app-config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL || ""}";
    window.SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY || ""}";
  `);
});

// =====================================================
// 🧠 COMPS API (uses optional APIFY)
// =====================================================
const APIFY_TOKEN = process.env.APIFY_TOKEN || "";

app.post("/api/comps/search", async (req, res) => {
  try {
    const { property, sameBuilding, stayWindow } = req.body || {};

    if (!property) {
      return res.status(400).json({ error: "Missing property" });
    }

    // fallback if no API
    if (!APIFY_TOKEN) {
      return res.json({
        provider: "fallback",
        comps: [],
        search_summary: "No APIFY_TOKEN set — using manual comps"
      });
    }

    // Example placeholder (replace with real actor if needed)
    const apiUrl = `https://api.apify.com/v2/acts/kaix~airbnb-listing-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const payload = {
      location: property.city || "Cartagena",
      maxListings: 8
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    const comps = (data || []).map((item) => ({
      name: item.name || "Listing",
      url: item.url,
      rate_usd: item.price || null,
      rating: item.rating || null,
      live: true
    }));

    res.json({
      provider: "Apify",
      comps,
      search_summary: `${comps.length} comps loaded`
    });

  } catch (err) {
    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

// =====================================================
// 📁 STATIC FILES
// =====================================================
app.use(express.static(__dirname));

// =====================================================
// 🏠 ROOT ROUTE
// =====================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, HTML_FILE));
});

// =====================================================
// ❤️ HEALTH CHECK
// =====================================================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    supabaseConfigured: !!process.env.SUPABASE_URL
  });
});

// =====================================================
// 🚀 START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});