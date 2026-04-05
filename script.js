let userLat = null;
let userLng = null;
let riskSmsPlaceName = "";

/** When opened as file://, relative fetch("/api/...") targets the wrong URL; use the local dev server. */
const LOCAL_SERVER_PORT = 3000;
const API_BASE =
    typeof window !== "undefined" && window.location.protocol === "file:"
        ? `http://127.0.0.1:${LOCAL_SERVER_PORT}`
        : "";

function windDirectionLabel(deg) {
    if (deg == null || Number.isNaN(Number(deg))) return "--";
    const d = Number(deg);
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(d / 45) % 8];
}

function formatHourLabel(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
let audioCtx = null;
let buzzerOsc = null;
let buzzerGain = null;
let buzzerPulseTimer = null;
let buzzerToneTimer = null;
let healthTimer = null;

async function api(path, options) {
    try {
        const res = await fetch(API_BASE + path, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
    } catch (err) {
        return null;
    }
}

function ensureAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return true;
}

function startBuzzer(mode) {
    if (!ensureAudio()) return;
    stopBuzzer();
    buzzerOsc = audioCtx.createOscillator();
    buzzerGain = audioCtx.createGain();
    buzzerOsc.type = "square";
    buzzerOsc.frequency.setValueAtTime(850, audioCtx.currentTime);
    buzzerGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    buzzerOsc.connect(buzzerGain);
    buzzerGain.connect(audioCtx.destination);
    buzzerOsc.start();

    let on = false;
    buzzerPulseTimer = setInterval(function () {
        if (!buzzerGain || !audioCtx) return;
        on = !on;
        const target = on ? 0.2 : 0.0001;
        buzzerGain.gain.cancelScheduledValues(audioCtx.currentTime);
        buzzerGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 0.04);
    }, 180);

    if (mode === "sos") {
        let high = false;
        buzzerToneTimer = setInterval(function () {
            if (!buzzerOsc || !audioCtx) return;
            high = !high;
            buzzerOsc.frequency.setValueAtTime(high ? 980 : 760, audioCtx.currentTime);
        }, 220);
    }
}

function stopBuzzer() {
    if (buzzerPulseTimer) {
        clearInterval(buzzerPulseTimer);
        buzzerPulseTimer = null;
    }
    if (buzzerToneTimer) {
        clearInterval(buzzerToneTimer);
        buzzerToneTimer = null;
    }
    if (buzzerOsc) {
        try {
            buzzerOsc.stop();
            buzzerOsc.disconnect();
        } catch (e) { }
        buzzerOsc = null;
    }
    if (buzzerGain) {
        try {
            buzzerGain.disconnect();
        } catch (e) { }
        buzzerGain = null;
    }
}

function applyPosition(pos) {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    const mapEl = document.getElementById("main-map");
    if (mapEl) {
        mapEl.src = `https://www.google.com/maps?q=${userLat},${userLng}&output=embed`;
    }
    const status = document.getElementById("status-display");
    if (status) status.textContent = "Live location detected. Weather loads from the server.";
    loadWeatherForecast();
}

function initLocation() {
    const status = document.getElementById("status-display");
    if (!navigator.geolocation) {
        if (status) status.textContent = "Location is not supported on this browser.";
        return;
    }
    const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
    if (!isSecure) {
        if (status) {
            status.textContent =
                "Use HTTPS (e.g. ngrok) or localhost so the browser allows location and weather.";
        }
    }
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            applyPosition(pos);
        },
        function (err) {
            let msg = "Allow location permission for map, SOS, and weather.";
            if (err && err.code === 1) msg = "Location blocked. Tap the lock icon in the address bar and allow Location, then tap ↻ in Weather.";
            if (err && err.code === 3) msg = "Location timed out. Move outdoors or tap ↻ in Weather to retry.";
            if (status) status.textContent = msg;
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
}

function refreshLocationAndWeather() {
    const btn = document.getElementById("weather-refresh-btn");
    if (btn) btn.classList.add("weather-refresh-spin");
    const status = document.getElementById("status-display");
    if (!navigator.geolocation) {
        if (status) status.textContent = "Geolocation not available.";
        if (btn) btn.classList.remove("weather-refresh-spin");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function (pos) {
            applyPosition(pos);
            if (btn) btn.classList.remove("weather-refresh-spin");
        },
        function (err) {
            let msg = "Could not refresh location.";
            if (err && err.code === 1) msg = "Location permission denied. Allow it in browser settings.";
            if (status) status.textContent = msg;
            if (btn) btn.classList.remove("weather-refresh-spin");
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
}

function findService(type) {
    if (userLat === null || userLng === null) return;
    let query = "";
    if (type === "police") query = "police station near me";
    if (type === "hospital") query = "hospital near me";
    if (type === "hotel") query = "hotels near me";
    const url = "https://www.google.com/maps/search/" + encodeURIComponent(query) + "/@" + userLat + "," + userLng + ",15z";
    window.location.href = url;
}

async function activateEmergency() {
    startBuzzer("sos");
    await api("/api/sos", {
        method: "POST",
        body: JSON.stringify({ lat: userLat, lng: userLng, source: "sos-button", note: "SOS pressed" })
    });
    if (userLat !== null && userLng !== null) {
        const link = `https://www.google.com/maps?q=${userLat},${userLng}`;
        alert("EMERGENCY ALERT\n\nLocation:\n" + link);
    }
    setTimeout(stopBuzzer, 5000);
    window.location.href = "tel:100";
}

function toggleAlarm() {
    const btn = document.getElementById("alarm-btn");
    const icon = document.getElementById("alarm-icon");
    const text = document.getElementById("alarm-text");
    const status = document.getElementById("status-display");
    if (!btn) return;

    if (btn.classList.contains("alarm-active")) {
        stopBuzzer();
        btn.classList.remove("alarm-active");
        if (icon) icon.textContent = "🔊";
        if (text) text.textContent = "Sound Alarm";
        if (status) status.innerText = "System ready for assistance.";
    } else {
        startBuzzer("alarm");
        btn.classList.add("alarm-active");
        if (icon) icon.textContent = "🔔";
        if (text) text.textContent = "Alarm ON";
        if (status) status.innerText = "Alarm active - drawing attention.";
    }
}

function callEmergency() {
    window.location.href = "tel:100";
}

function weatherIcon(code) {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌡️";
}

function weatherText(code) {
    const map = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Rain", 65: "Heavy rain", 71: "Slight snow",
        73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers",
        82: "Violent rain showers", 95: "Thunderstorm"
    };
    return map[code] || "Weather update";
}

async function loadWeatherForecast() {
    const main = document.getElementById("weather-main");
    const details = document.getElementById("weather-details");
    const safety = document.getElementById("weather-safety");
    const features = document.getElementById("weather-features");
    const icon = document.getElementById("weather-icon");
    const pill = document.getElementById("weather-status-pill");
    if (!main || !details || !safety || !features) return;
    if (userLat === null || userLng === null) return;

    main.innerHTML =
        '<div class="weather-loading"><div class="loading-spinner"></div><p>Loading weather from server...</p></div>';

    const data = await api(`/api/weather?lat=${encodeURIComponent(userLat)}&lng=${encodeURIComponent(userLng)}`);
    if (!data || !data.ok) {
        main.innerHTML =
            "<p>Weather API failed. Run <strong>node server.js</strong> and open this site from that server (or ngrok). VS Code Live Server alone has no backend.</p>";
        return;
    }

    const current = data.current || {};
    const daily = data.daily || {};
    const forecast = Array.isArray(data.forecast) ? data.forecast : [];
    const hourlyForecast = Array.isArray(data.hourlyForecast) ? data.hourlyForecast : [];
    const condition = weatherText(current.weatherCode);
    const iconChar = weatherIcon(current.weatherCode);
    const severity = data.safetyLevel || "safe";
    const safetyText = data.safetyMessage || "Weather looks normal.";
    const placeLine = data.placeName
        ? `<div class="weather-place">${data.placeName}</div>`
        : `<div class="weather-place">${Number(data.lat).toFixed(4)}, ${Number(data.lng).toFixed(4)}</div>`;
    const tzLine = data.timezone
        ? `<div class="weather-tz">Timezone: ${data.timezone} · via backend Open-Meteo</div>`
        : "";

    if (icon) icon.textContent = iconChar;
    if (pill) pill.textContent = String(severity).toUpperCase();

    main.innerHTML = `
        ${placeLine}
        <div class="weather-temp">${Math.round(current.temperature ?? 0)}°C</div>
        <div class="weather-condition">${condition}</div>
        <div class="weather-feels">Feels like ${Math.round(current.apparentTemperature ?? current.temperature ?? 0)}°C</div>
        ${tzLine}
    `;

    safety.innerHTML = `
        <div class="safety-status ${severity}">
            <div class="safety-icon">${severity === "danger" ? "🚨" : severity === "warning" ? "⚠️" : "✅"}</div>
            <div class="safety-content">
                <div class="safety-title">Weather Safety</div>
                <div class="safety-message">${safetyText}</div>
            </div>
        </div>
    `;

    const windDir = windDirectionLabel(current.windDirection);
    const windDeg =
        current.windDirection != null && !Number.isNaN(Number(current.windDirection))
            ? `${Math.round(Number(current.windDirection))}°`
            : "--";
    const precipNow =
        current.precipitationMm != null && !Number.isNaN(Number(current.precipitationMm))
            ? `${Number(current.precipitationMm).toFixed(1)} mm`
            : "--";
    details.innerHTML = `
        <div class="detail-item"><span class="detail-icon">💨</span><span class="detail-label">Wind</span><span class="detail-value">${Math.round(current.windSpeed ?? 0)} km/h ${windDir} (${windDeg})</span></div>
        <div class="detail-item"><span class="detail-icon">💧</span><span class="detail-label">Humidity</span><span class="detail-value">${Math.round(current.humidity ?? 0)}%</span></div>
        <div class="detail-item"><span class="detail-icon">☁️</span><span class="detail-label">Cloud</span><span class="detail-value">${Math.round(current.cloudCover ?? 0)}%</span></div>
        <div class="detail-item"><span class="detail-icon">🌧️</span><span class="detail-label">Rain risk</span><span class="detail-value">${Math.round(current.precipitationProbability ?? 0)}%</span></div>
        <div class="detail-item"><span class="detail-icon">💦</span><span class="detail-label">Precip now</span><span class="detail-value">${precipNow}</span></div>
        <div class="detail-item"><span class="detail-icon">🌅</span><span class="detail-label">Today</span><span class="detail-value">${Math.round(daily.minTemp ?? 0)}° / ${Math.round(daily.maxTemp ?? 0)}°</span></div>
    `;

    const hourlyRows = hourlyForecast
        .map(
            (h) =>
                `<div class="feature-item"><span>${formatHourLabel(h.time)}</span><span>${Math.round(h.temp ?? 0)}° ${weatherIcon(h.code)} · ${Math.round(h.precipPct ?? 0)}% rain</span></div>`
        )
        .join("");

    features.innerHTML = `
        <div class="feature-card">
            <h4>Next 12 hours (server forecast)</h4>
            <div class="feature-list">${hourlyRows || "<span>No hourly data.</span>"}</div>
        </div>
        <div class="feature-card">
            <h4>3-Day Forecast</h4>
            <div class="feature-list">
                ${forecast.slice(0, 3).map((d) => `<div class="feature-item"><span>${d.date}</span><span>${Math.round(d.min)}°/${Math.round(d.max)}° ${weatherIcon(d.code)}</span></div>`).join("")}
            </div>
        </div>
    `;
}

function toggleWeatherDetails() {
    const details = document.getElementById("weather-details");
    const features = document.getElementById("weather-features");
    const btn = document.getElementById("weather-toggle");
    if (!btn || !details || !features) return;
    const show = !details.classList.contains("open");
    details.classList.toggle("open", show);
    features.classList.toggle("open", show);
    btn.textContent = show ? "Hide details" : "Show details";
}

function toggleProfilePanel() {
    const panel = document.getElementById("profile-panel");
    if (!panel) return;
    panel.classList.toggle("hidden");
}

function applyProfile(profile) {
    if (!profile) return;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.textContent = String(val);
    };
    set("profile-name", profile.name);
    set("profile-age", profile.age);
    set("profile-phone", profile.phone);
    set("profile-email", profile.email);
    set("profile-emergency", profile.emergencyPhone);
    set("profile-blood", profile.bloodType);
    const photo = document.getElementById("profile-photo");
    if (photo && profile.name) {
        const initials = profile.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
        photo.textContent = initials;
    }
}

function refreshHealthData() {
    const heartRate = 62 + Math.floor(Math.random() * 28);
    const sys = 108 + Math.floor(Math.random() * 24);
    const dia = 68 + Math.floor(Math.random() * 12);
    const spo2 = 96 + Math.floor(Math.random() * 4);
    const stress = 15 + Math.floor(Math.random() * 45);
    const steps = 1200 + Math.floor(Math.random() * 4800);

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
    };
    set("health-hr", heartRate);
    set("health-bp", `${sys}/${dia}`);
    set("health-spo2", spo2);
    set("health-stress", stress);
    set("health-steps", steps.toLocaleString());

    api("/api/health-snapshot", {
        method: "POST",
        body: JSON.stringify({
            heartRate,
            bloodPressure: `${sys}/${dia}`,
            spo2,
            stress
        })
    });
}

function toggleHealthPanel() {
    const panel = document.getElementById("health-panel");
    if (!panel) return;
    const willOpen = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    if (willOpen) {
        refreshHealthData();
        healthTimer = setInterval(refreshHealthData, 8000);
    } else if (healthTimer) {
        clearInterval(healthTimer);
        healthTimer = null;
    }
}

function toggleChatbot() {
    const panel = document.getElementById("chat-panel");
    if (!panel) return;
    panel.classList.toggle("hidden");
}

/** Rule-based travel assistant when the backend is unreachable (offline or server not started). */
function localTravelChatReply(text) {
    const t = String(text || "").trim();
    const lower = t.toLowerCase();

    if (/\b(sos|emergency|help|unsafe)\b/.test(lower)) {
        return {
            type: "emergency",
            message:
                "Emergency mode: Call Police 100 / Ambulance 108 immediately. Share your live location, move to a safe public place, and use the Hospital/Police buttons."
        };
    }
    if (/\b(hotel|restaurant|hospital)\b/.test(lower)) {
        return {
            type: "info",
            message:
                "Use service buttons for Hospital/Hotels and search bar for restaurants near your live location."
        };
    }
    if (/\b(weather|rain|temperature)\b/.test(lower)) {
        return {
            type: "info",
            message:
                "Check Weather Conditions section in the app. Carry essentials based on forecast and avoid risky weather routes."
        };
    }
    if (/\b(route|direction|navigation|map)\b/.test(lower)) {
        return {
            type: "info",
            message:
                "Type destination in search, tap Go, and follow Google Maps safe route directions."
        };
    }
    if (
        /^(hi|hello|hey|hii|yo|greetings)\b/i.test(t) ||
        /^good\s+(morning|afternoon|evening)\b/i.test(lower) ||
        /^how\s+are\s+you\b/i.test(lower)
    ) {
        return {
            type: "info",
            message:
                "Hello! I can help with safe routes, weather, hotels, hospitals, and trip planning. What would you like to know? Say \"emergency\" if you need urgent help."
        };
    }
    if (t.length > 0 && t.length <= 3) {
        return {
            type: "info",
            message:
                "Could you add a bit more detail? Try: weather, directions, hotel, hospital, or \"emergency\" for urgent help."
        };
    }
    return {
        type: "info",
        message:
            "I can help with attractions, trip planning, transport, hotels, weather, safety, and emergency support. Ask me about your destination or say \"emergency\" if needed."
    };
}

function addChatBubble(text, who) {
    const messages = document.getElementById("chat-messages");
    if (!messages) return;
    const msg = document.createElement("div");
    msg.className = "chat-msg " + who;
    msg.innerHTML = `<span class="chat-avatar">${who === "user" ? "You" : "AI"}</span><div class="chat-bubble"></div>`;
    const bubble = msg.querySelector(".chat-bubble");
    bubble.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    if (!input || !input.value.trim()) return;
    const message = input.value.trim();
    input.value = "";
    addChatBubble(message, "user");
    let reply = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message })
    });
    if (!reply || !reply.message) {
        reply = localTravelChatReply(message);
    }
    addChatBubble(reply.message, "bot");
}

async function searchPlaceSafeRoute() {
    const input = document.getElementById("place-search");
    const resultEl = document.getElementById("search-result");
    const placeName = (input && input.value.trim()) || "";
    if (!placeName || userLat === null || userLng === null) return;
    riskSmsPlaceName = placeName;
    const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${encodeURIComponent(placeName)}&travelmode=driving`;
    if (resultEl) {
        resultEl.innerHTML = `Safe route to <strong>${placeName}</strong>. <a href="${dirUrl}" target="_blank" rel="noopener">Open directions</a>`;
    }
    const riskBanner = document.getElementById("risk-sms-alert");
    if (riskBanner) riskBanner.classList.remove("hidden");
    await api("/api/location/update", {
        method: "POST",
        body: JSON.stringify({ lat: userLat, lng: userLng, place: placeName })
    });
    window.open(dirUrl, "_blank");
}

function sendRiskSmsAlert() {
    const place = riskSmsPlaceName || "my current area";
    let body = `I am heading to ${place}. Please track my location.`;
    if (userLat !== null && userLng !== null) {
        body += ` Map link: https://www.google.com/maps?q=${userLat},${userLng}`;
    }
    window.location.href = `sms:?body=${encodeURIComponent(body)}`;
}

function shareLiveLocation() {
    if (userLat === null || userLng === null) return;
    const url = `https://www.google.com/maps?q=${userLat},${userLng}`;
    if (navigator.share) {
        navigator.share({ title: "My live location", text: "Track me with this live location link", url });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
    }
}

function updateDateTime() {
    const timeEl = document.getElementById("app-time");
    const dateEl = document.getElementById("app-date");
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
    dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

window.onload = async function () {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    initLocation();
    const profile = await api("/api/profile");
    applyProfile(profile);
    const backendHint = document.getElementById("backend-hint");
    if (!profile && backendHint) {
        backendHint.hidden = false;
        backendHint.innerHTML =
            "Weather and SOS APIs need the Node server. Run <code>node server.js</code>, open <strong>http://localhost:3000</strong>, or use <strong>ngrok</strong> for HTTPS on your phone.";
    }

    const placeInput = document.getElementById("place-search");
    if (placeInput) {
        placeInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") searchPlaceSafeRoute();
        });
    }
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    const health = await api("/api/health");
    const publicHint = document.getElementById("public-hint");
    if (health && Array.isArray(health.addresses) && health.addresses.length && publicHint) {
        const port = window.location.port || "3000";
        publicHint.hidden = false;
        publicHint.textContent = `Same Wi‑Fi: http://${health.addresses[0]}:${port}  ·  Phone: use ngrok HTTPS if this does not load.`;
    }
};
