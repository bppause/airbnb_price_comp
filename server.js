import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const APIFY_ACTOR = process.env.APIFY_ACTOR || 'kaix/airbnb-listing-scraper';
const SUBJECT_FILE = process.env.HTML_FILE || 'morroskai_pricing_v2_connected.html';

function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeStayWindow(stayWindow) {
  if (!stayWindow?.checkIn) return null;
  const checkIn = String(stayWindow.checkIn).slice(0, 10);
  const checkOut = stayWindow?.checkOut ? String(stayWindow.checkOut).slice(0, 10) : addDaysIso(checkIn, 7);
  return { checkIn, checkOut, label: stayWindow?.label || `${checkIn} to ${checkOut}` };
}

function normalizeUrl(url) {
  return String(url || '').replace(/\?.*$/, '');
}

function roomIdFromUrl(url) {
  const m = String(url || '').match(/\/rooms\/(\d+)/);
  return m ? m[1] : null;
}

function inferRateUsd(item) {
  const candidates = [
    item?.price?.amount,
    item?.price?.nightly,
    item?.nightlyRate?.amount,
    item?.nightlyRate,
    item?.avgPrice?.amount,
    item?.pricePerNight,
    item?.rate?.amount,
    item?.rate,
    item?.pricingQuote?.rate?.amount,
    item?.pricingQuote?.structuredStayDisplayPrice?.primaryLine?.price,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return Math.round(c);
    if (typeof c === 'string') {
      const n = Number(String(c).replace(/[^0-9.]/g, ''));
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  return null;
}

function inferRating(item) {
  const candidates = [
    item?.rating,
    item?.starRating,
    item?.avgRating,
    item?.reviews?.rating,
    item?.reviewSummary?.rating,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string') {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function inferReviews(item) {
  const candidates = [
    item?.reviewsCount,
    item?.numberOfReviews,
    item?.reviews?.count,
    item?.reviewSummary?.count,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string') {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function inferBedrooms(item) {
  const candidates = [item?.bedrooms, item?.bedroomCount, item?.rooms?.bedrooms];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string') {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function inferBathrooms(item) {
  const candidates = [item?.bathrooms, item?.bathroomCount, item?.rooms?.bathrooms];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string') {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function inferTitle(item) {
  return item?.name || item?.title || item?.listingName || item?.seoFeatures?.ogTags?.ogTitle || 'Listing';
}

function inferUrl(item) {
  if (item?.url) return normalizeUrl(item.url);
  if (item?.link) return normalizeUrl(item.link);
  const id = item?.id || item?.roomId || item?.listingId;
  return id ? `https://www.airbnb.com/rooms/${id}` : '';
}

function noteForListing(item, subject, sameBuilding) {
  const notes = [];
  const title = String(inferTitle(item) || '');
  const building = String(subject?.building || '');
  const neighborhood = String(subject?.neighborhood || '');
  const city = String(subject?.city || '');
  if (sameBuilding && building && title.toLowerCase().includes(building.toLowerCase())) {
    notes.push('Same building match.');
  } else if (building) {
    notes.push(`Comparable to ${building}.`);
  }
  if (neighborhood || city) notes.push(`Area: ${[neighborhood, city].filter(Boolean).join(', ')}.`);
  const beds = inferBedrooms(item);
  const baths = inferBathrooms(item);
  if (beds || baths) notes.push(`${beds ?? '?'}BR/${baths ?? '?'}BA.`);
  return notes.join(' ');
}

function buildSearchInput(subject, sameBuilding, stayWindow) {
  const building = subject?.building || '';
  const neighborhood = subject?.neighborhood || '';
  const city = subject?.city || 'Cartagena';
  const country = subject?.country || 'Colombia';
  const window = normalizeStayWindow(stayWindow);
  return {
    location: [building, neighborhood, city, country].filter(Boolean).join(', '),
    adults: Math.max(1, Number(subject?.maxGuests) || 1),
    minBedrooms: Math.max(1, Number(subject?.bedrooms) || 1),
    minBathrooms: Math.max(1, Number(subject?.bathrooms) || 1),
    propertyType: ['entire_home'],
    maxListings: sameBuilding ? 8 : 12,
    maxSearchPages: 2,
    includeReviews: false,
    checkIn: window?.checkIn,
    checkOut: window?.checkOut,
  };
}

async function searchViaApify(subject, sameBuilding, existingComps, stayWindow) {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');

  const listings = (existingComps || [])
    .map((c) => c?.url)
    .filter((u) => /airbnb\.com\/rooms\//.test(String(u)));

  const normalizedWindow = normalizeStayWindow(stayWindow);
  const input = listings.length
    ? { listings: listings.map(normalizeUrl), checkIn: normalizedWindow?.checkIn, checkOut: normalizedWindow?.checkOut }
    : buildSearchInput(subject, sameBuilding, normalizedWindow);

  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR.replace('/', '~'))}/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_TOKEN)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`Apify error ${resp.status}: ${text.slice(0, 240)}`);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Apify returned an unexpected payload');

  const subjectBuilding = String(subject?.building || '').toLowerCase();
  let comps = data
    .map((item) => {
      const url = inferUrl(item);
      return {
        url,
        name: inferTitle(item).slice(0, 36),
        rate_usd: inferRateUsd(item),
        rating: inferRating(item),
        reviews: inferReviews(item),
        bedrooms: inferBedrooms(item),
        bathrooms: inferBathrooms(item),
        found: !!inferRateUsd(item),
        notes: noteForListing(item, subject, sameBuilding),
      };
    })
    .filter((c) => c.url);

  if (sameBuilding && subjectBuilding) {
    const filtered = comps.filter((c) => {
      const hay = `${c.name} ${c.notes}`.toLowerCase();
      return hay.includes(subjectBuilding) || hay.includes('morros kai') || hay.includes('morros k');
    });
    if (filtered.length) comps = filtered;
  }

  const deduped = [];
  const seen = new Set();
  for (const comp of comps) {
    const key = roomIdFromUrl(comp.url) || comp.url;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(comp);
    }
  }

  const limited = deduped.slice(0, 8);
  const priced = limited.filter((c) => typeof c.rate_usd === 'number');
  const avg = priced.length ? priced.reduce((s, c) => s + c.rate_usd, 0) / priced.length : null;
  const rateRange = priced.length
    ? `$${Math.min(...priced.map((c) => c.rate_usd))}–$${Math.max(...priced.map((c) => c.rate_usd))}`
    : 'not available';

  return {
    provider: 'Apify Airbnb scraper',
    stayWindow: normalizedWindow, 
    comps: limited,
    market_avg_usd: avg,
    search_summary: priced.length
      ? `Loaded ${priced.length} priced Airbnb comps${sameBuilding ? ' from the same building when available' : ''}${normalizedWindow ? ` for ${normalizedWindow.checkIn} to ${normalizedWindow.checkOut}` : ''}. Observed nightly range ${rateRange}; average ${avg ? '$' + avg.toFixed(0) : 'n/a'}.`
      : `Listings loaded${normalizedWindow ? ` for ${normalizedWindow.checkIn} to ${normalizedWindow.checkOut}` : ''}, but no nightly prices were returned by the provider for this query.`,
  };
}

function buildManualFallback(subject, existingComps, stayWindow) {
  const comps = (existingComps || [])
    .filter((c) => c?.url)
    .map((c) => ({
      url: normalizeUrl(c.url),
      name: (c.name || 'Listing').slice(0, 36),
      rate_usd: typeof c.rate_usd === 'number' ? c.rate_usd : null,
      rating: typeof c.rating === 'number' ? c.rating : null,
      reviews: typeof c.reviews === 'number' ? c.reviews : null,
      bedrooms: c.bedrooms ?? subject?.bedrooms ?? null,
      bathrooms: c.bathrooms ?? subject?.bathrooms ?? null,
      found: typeof c.rate_usd === 'number',
      notes: c.notes || 'Manual comp. Add APIFY_TOKEN for live refresh.',
    }));

  const priced = comps.filter((c) => typeof c.rate_usd === 'number');
  const avg = priced.length ? priced.reduce((s, c) => s + c.rate_usd, 0) / priced.length : null;
  const normalizedWindow = normalizeStayWindow(stayWindow);
  return {
    provider: 'Manual fallback',
    stayWindow: normalizedWindow,
    comps,
    market_avg_usd: avg,
    search_summary: `Using the existing comp list from the page${normalizedWindow ? ` for ${normalizedWindow.checkIn} to ${normalizedWindow.checkOut}` : ''}. Set APIFY_TOKEN to enable live Airbnb comp refresh through the backend.`,
  };
}

app.post('/api/comps/search', async (req, res) => {
  try {
    const { property, sameBuilding = true, existingComps = [], stayWindow = null } = req.body || {};
    if (!property) {
      return res.status(400).json({ error: 'Missing property payload.' });
    }

    let result;
    try {
      result = await searchViaApify(property, sameBuilding, existingComps, stayWindow);
    } catch (err) {
      result = buildManualFallback(property, existingComps, stayWindow);
      result.warning = err.message;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, providerConfigured: !!APIFY_TOKEN, actor: APIFY_ACTOR });
});

app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, SUBJECT_FILE));
});

app.listen(PORT, () => {
  console.log(`Morros KAI pricing app running on http://localhost:${PORT}`);
  console.log(`Live provider configured: ${APIFY_TOKEN ? 'yes' : 'no (manual fallback)'}`);
});
