import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const SUPABASE_URL = "https://naspwcdypjwzbcmsohpt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XMIfEG3Gk4QBWyNtX2QeZA_ILHrtwG8";

const app = express();

// ✅ Use Render port
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware
app.use(express.json());

// ✅ Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));


// ======================================================
// 🔐 Dynamic app-config.js (from Render env variables)
// ======================================================
app.get("/app-config.js", (req, res) => {
  res.type("application/javascript").send(`
    window.APP_CONFIG = {
      SUPABASE_URL: "${process.env.SUPABASE_URL || ""}",
      SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ""}"
    };
  `);
});


// ======================================================
// 🏠 Main app route
// ======================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "morroskai_pricing_auth_full.html"));
});


// ======================================================
// ❤️ Health check
// ======================================================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      hasApify: !!process.env.APIFY_SYNC_URL
    }
  });
});


// ======================================================
// 🧠 Comps API (Apify proxy)
// ======================================================
app.post("/api/comps/search", async (req, res) => {
  try {
    console.log("🔍 Fetching comps...");

    const {
      compSearchLocation,
      property,
      stayWindow
    } = req.body || {};

    if (!process.env.APIFY_SYNC_URL) {
      throw new Error("APIFY_SYNC_URL not set");
    }

    const location =
      compSearchLocation ||
      property?.searchLocation ||
      "Cartagena, Colombia";

    const payload = {
      location: location,
      maxItems: 10
    };

    console.log("📡 Sending to Apify:", payload);

    const response = await fetch(process.env.APIFY_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const raw = await response.json();

    console.log("📦 RAW APIFY:", raw);

    let items = [];

    if (Array.isArray(raw)) {
      items = raw;
    } else if (Array.isArray(raw?.items)) {
      items = raw.items;
    } else if (Array.isArray(raw?.data)) {
      items = raw.data;
    }

    if (!items.length) {
      return res.json({
        comps: [],
        provider: "apify",
        search_summary: "No listings returned",
        market_avg_usd: null
      });
    }

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
      bedrooms: it.bedrooms || null,
      bathrooms: it.bathrooms || null,
      found: true
    }));

    const valid = comps.filter(c => c.rate_usd);
    const avg = valid.length
      ? valid.reduce((s, c) => s + c.rate_usd, 0) / valid.length
      : null;

    res.json({
      comps,
      provider: "apify",
      search_summary: `Live comps for ${location}`,
      market_avg_usd: avg
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    res.status(500).json({
      error: true,
      message: err.message
    });
  }
});


// ======================================================
// 🚀 Start server
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🔐 Supabase URL:", !!process.env.SUPABASE_URL);
  console.log("🔐 Supabase Key:", !!process.env.SUPABASE_ANON_KEY);
  console.log("🔗 Apify URL:", !!process.env.APIFY_SYNC_URL);
});