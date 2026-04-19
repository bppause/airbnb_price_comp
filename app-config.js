
Brian Pause <bppause@gmail.com>
4:54 PM (0 minutes ago)
to me

window.APP_CONFIG = {
  supabase: {
    url: "https://naspwcdypjwzbcmsohpt.supabase.co",
    anonKey: "sb_publishable_XMIfEG3Gk4QBWyNtX2QeZA_ILHrtwG8"
  },

  auth: {
    providers: {
      google: true,
      apple: false
    },
    redirectTo: window.location.origin
  },

  app: {
    appName: "Morroskai Pricing App",
    storageKey: "morroskai_pricing_settings",
    defaultViewYear: 2026
  },

  defaults: {
    baseRateCOP: 400000,
    fxRate: 3500,
    cohostSharePct: 85,
    flatDiscountPct: 15,
    airbnbFeePct: 20,
    compSearchLocation: "Playa Manzanillo, Cartagena, Colombia",
    sameBuildingOnly: true
  },

  property: {
    building: "Morros Kai",
    unit: "317",
    neighborhood: "Playa Manzanillo",
    city: "Cartagena",
    country: "Colombia",
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 6,
    floorArea: "",
    floor: "",
    rating: 5.0,
    amenities: [
      "Beach access",
      "Pool",
      "Gym",
      "Parking",
      "A/C",
      "WiFi",
      "Washer/Dryer",
      "Kitchen",
      "Smart TV"
    ],
    notes: "Newest building in Serena del Mar. Direct beach access."
  },

  years: [
    {
      year: 2026,
      inflation: 6.3,
      regularOccupancyPct: 55,
      peakOccupancyPct: 78,
      monthlyOperatingCostsCOP: 9800000,
      monthlyOtherIncomeCOP: 1000000,
      lowMonths: [4, 7, 8, 9],
      overrides: {
        baseRateCOP: null,
        fxRate: 3500,
        cohostSharePct: null,
        flatDiscountPct: null,
        airbnbFeePct: null
      },
      peaks: [
        { start: "2026-04-01", end: "2026-04-05", markupPct: 30, label: "Easter" },
        { start: "2026-06-15", end: "2026-08-01", markupPct: 30, label: "Summer High Season" },
        { start: "2026-10-08", end: "2026-10-11", markupPct: 30, label: "Columbus Day" },
        { start: "2026-11-12", end: "2026-11-15", markupPct: 30, label: "Independence" },
        { start: "2026-12-01", end: "2026-12-29", markupPct: 30, label: "December Season" },
        { start: "2026-12-30", end: "2027-01-02", markupPct: 200, label: "New Year" }
      ]
    },
    {
      year: 2027,
      inflation: 3.7,
      regularOccupancyPct: 55,
      peakOccupancyPct: 78,
      monthlyOperatingCostsCOP: 9800000,
      monthlyOtherIncomeCOP: 1000000,
      lowMonths: [4, 7, 8, 9],
      overrides: {
        baseRateCOP: null,
        fxRate: 3500,
        cohostSharePct: null,
        flatDiscountPct: null,
        airbnbFeePct: null
      },
      peaks: [
        { start: "2027-01-03", end: "2027-01-20", markupPct: 100, label: "January High Demand" },
        { start: "2027-04-14", end: "2027-04-18", markupPct: 30, label: "Easter" },
        { start: "2027-06-15", end: "2027-08-01", markupPct: 30, label: "Summer High Season" },
        { start: "2027-10-11", end: "2027-10-12", markupPct: 30, label: "Columbus Day" },
        { start: "2027-11-11", end: "2027-11-15", markupPct: 30, label: "Independence" },
        { start: "2027-12-01", end: "2027-12-29", markupPct: 30, label: "December Season" },
        { start: "2027-12-30", end: "2028-01-02", markupPct: 200, label: "New Year" }
      ]
    }
  ],

  fallbackComps: [
    {
      name: "Morros Kai #1538",
      url: "https://www.airbnb.com/rooms/1538124273490670394",
      rate_usd: 115,
      rating: 5.0,
      reviews: null,
      found: true
    },
    {
      name: "Morros Kai Manzanillo",
      url: "https://www.airbnb.com/rooms/1574666192917720867",
      rate_usd: 95,
      rating: null,
      reviews: null,
      found: true
    },
    {
      name: "Ocean View 2 Suites",
      url: "https://www.airbnb.com/rooms/1632624456085695382",
      rate_usd: 110,
      rating: null,
      reviews: null,
      found: true
    }
  ]
};