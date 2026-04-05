const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;
/** Vercel serverless: project dir is read-only; use /tmp for demo JSON store (resets when cold). */
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? path.join("/tmp", "sos-data") : path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(self)");
  next();
});
app.use(express.static(__dirname));

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial = {
      profile: {
        name: "John Doe",
        age: 28,
        phone: "+1 234 567 8900",
        email: "john.doe@example.com",
        emergencyPhone: "+1 234 567 8901",
        bloodType: "O+"
      },
      emergencyContacts: [
        { name: "Family Contact", phone: "+1 234 567 8901", relation: "Family" },
        { name: "Friend Contact", phone: "+1 234 567 8910", relation: "Friend" }
      ],
      sosEvents: [],
      locationEvents: [],
      healthSnapshots: []
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
}

function writeStore(next) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(next, null, 2), "utf-8");
}

function emergencyReply() {
  return {
    type: "emergency",
    message:
      "Emergency mode: Call Police 100 / Ambulance 108 immediately. Share your live location, move to a safe public place, and use the Hospital/Police buttons."
  };
}

function weatherSafety(current) {
  const wind = Number(current.windSpeed || 0);
  const rain = Number(current.precipitationProbability || 0);
  const code = Number(current.weatherCode || 0);
  if (rain >= 85 || wind >= 50 || [95, 96, 99].includes(code)) {
    return {
      level: "danger",
      message: "Severe weather risk. Avoid travel and stay in a safe indoor place."
    };
  }
  if (rain >= 60 || wind >= 35 || [80, 81, 82, 65, 75].includes(code)) {
    return {
      level: "warning",
      message: "Caution advised. Carry rain gear and avoid isolated routes."
    };
  }
  return {
    level: "safe",
    message: "Weather is currently manageable for travel."
  };
}

async function reverseGeocodePlace(lat, lng) {
  try {
    const url =
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lng)}&language=en&count=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.results && data.results[0];
    if (!r) return null;
    const parts = [r.name, r.admin1, r.country].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

app.get("/api/health", (_req, res) => {
  const nets = os.networkInterfaces();
  const addresses = [];
  Object.keys(nets).forEach((name) => {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  });
  res.json({ ok: true, timestamp: new Date().toISOString(), addresses });
});

app.get("/api/profile", (_req, res) => {
  const store = readStore();
  res.json(store.profile);
});

app.get("/api/public-link", (req, res) => {
  const nets = os.networkInterfaces();
  const addresses = [];
  Object.keys(nets).forEach((name) => {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  });
  const port = Number(PORT);
  const links = addresses.map((ip) => `http://${ip}:${port}`);
  res.json({
    ok: true,
    links,
    note:
      "These links work on your same network. For global public internet access, expose this app via a tunnel or cloud host with HTTPS."
  });
});

app.post("/api/profile", (req, res) => {
  const store = readStore();
  store.profile = { ...store.profile, ...req.body };
  writeStore(store);
  res.json({ ok: true, profile: store.profile });
});

app.get("/api/contacts", (_req, res) => {
  const store = readStore();
  res.json(store.emergencyContacts);
});

app.post("/api/contacts", (req, res) => {
  const { name, phone, relation } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: "name and phone are required" });
  }
  const store = readStore();
  store.emergencyContacts.push({
    name: String(name),
    phone: String(phone),
    relation: relation ? String(relation) : "Contact"
  });
  writeStore(store);
  return res.json({ ok: true, contacts: store.emergencyContacts });
});

app.post("/api/sos", (req, res) => {
  const { lat, lng, source, note } = req.body || {};
  const store = readStore();
  const event = {
    id: "sos_" + Date.now(),
    source: source || "app",
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    note: note || "",
    createdAt: new Date().toISOString()
  };
  store.sosEvents.unshift(event);
  store.sosEvents = store.sosEvents.slice(0, 100);
  writeStore(store);
  res.json({ ok: true, event });
});

app.get("/api/sos/history", (_req, res) => {
  const store = readStore();
  res.json(store.sosEvents);
});

app.post("/api/location/update", (req, res) => {
  const { lat, lng, place } = req.body || {};
  const store = readStore();
  store.locationEvents.unshift({
    id: "loc_" + Date.now(),
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    place: place || "",
    createdAt: new Date().toISOString()
  });
  store.locationEvents = store.locationEvents.slice(0, 200);
  writeStore(store);
  res.json({ ok: true });
});

app.post("/api/health-snapshot", (req, res) => {
  const { heartRate, bloodPressure, spo2, stress } = req.body || {};
  const store = readStore();
  store.healthSnapshots.unshift({
    id: "hs_" + Date.now(),
    heartRate: heartRate || null,
    bloodPressure: bloodPressure || null,
    spo2: spo2 || null,
    stress: stress || null,
    createdAt: new Date().toISOString()
  });
  store.healthSnapshots = store.healthSnapshots.slice(0, 300);
  writeStore(store);
  res.json({ ok: true });
});

app.post("/api/chat", (req, res) => {
  const text = String((req.body && req.body.message) || "").trim();
  const lower = text.toLowerCase();

  if (/\b(sos|emergency|help|unsafe)\b/.test(lower)) {
    return res.json(emergencyReply());
  }
  if (/\b(hotel|restaurant|hospital)\b/.test(lower)) {
    return res.json({
      type: "info",
      message:
        "Use service buttons for Hospital/Hotels and search bar for restaurants near your live location."
    });
  }
  if (/\b(weather|rain|temperature)\b/.test(lower)) {
    return res.json({
      type: "info",
      message:
        "Check Weather Conditions section in the app. Carry essentials based on forecast and avoid risky weather routes."
    });
  }
  if (/\b(route|direction|navigation|map)\b/.test(lower)) {
    return res.json({
      type: "info",
      message:
        "Type destination in search, tap Go, and follow Google Maps safe route directions."
    });
  }
  if (
    /^(hi|hello|hey|hii|yo|greetings)\b/i.test(text) ||
    /^good\s+(morning|afternoon|evening)\b/i.test(lower) ||
    /^how\s+are\s+you\b/i.test(lower)
  ) {
    return res.json({
      type: "info",
      message:
        "Hello! I can help with safe routes, weather, hotels, hospitals, and trip planning. What would you like to know? Say \"emergency\" if you need urgent help."
    });
  }
  if (text.length > 0 && text.length <= 3) {
    return res.json({
      type: "info",
      message:
        "Could you add a bit more detail? Try: weather, directions, hotel, hospital, or \"emergency\" for urgent help."
    });
  }
  return res.json({
    type: "info",
    message:
      "I can help with attractions, trip planning, transport, hotels, weather, safety, and emergency support. Ask me your destination and plan."
  });
});

app.get("/api/weather", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: "lat and lng are required" });
  }
  try {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lng)}` +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,cloud_cover,precipitation" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&hourly=temperature_2m,weather_code,precipitation_probability" +
      "&timezone=auto&forecast_days=3";
    const [response, placeName] = await Promise.all([fetch(weatherUrl), reverseGeocodePlace(lat, lng)]);
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: "weather service unavailable" });
    }
    const payload = await response.json();
    const current = {
      temperature: payload.current && payload.current.temperature_2m,
      apparentTemperature: payload.current && payload.current.apparent_temperature,
      weatherCode: payload.current && payload.current.weather_code,
      windSpeed: payload.current && payload.current.wind_speed_10m,
      windDirection: payload.current && payload.current.wind_direction_10m,
      humidity: payload.current && payload.current.relative_humidity_2m,
      cloudCover: payload.current && payload.current.cloud_cover,
      precipitationMm: payload.current && payload.current.precipitation,
      precipitationProbability:
        payload.daily && Array.isArray(payload.daily.precipitation_probability_max)
          ? payload.daily.precipitation_probability_max[0]
          : 0
    };
    const daily = {
      maxTemp: payload.daily && payload.daily.temperature_2m_max ? payload.daily.temperature_2m_max[0] : null,
      minTemp: payload.daily && payload.daily.temperature_2m_min ? payload.daily.temperature_2m_min[0] : null
    };
    const forecast = (payload.daily && payload.daily.time ? payload.daily.time : []).map((date, i) => ({
      date,
      max: payload.daily.temperature_2m_max[i],
      min: payload.daily.temperature_2m_min[i],
      code: payload.daily.weather_code[i]
    }));
    const times = (payload.hourly && payload.hourly.time) || [];
    const hourlyForecast = times.slice(0, 12).map((time, i) => ({
      time,
      temp: payload.hourly.temperature_2m[i],
      code: payload.hourly.weather_code[i],
      precipPct: payload.hourly.precipitation_probability[i]
    }));
    const safety = weatherSafety(current);
    return res.json({
      ok: true,
      source: "open-meteo",
      timezone: payload.timezone || null,
      placeName,
      lat,
      lng,
      current,
      daily,
      forecast,
      hourlyForecast,
      safetyLevel: safety.level,
      safetyMessage: safety.message
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "failed to fetch weather" });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

ensureStore();

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SOS app running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
