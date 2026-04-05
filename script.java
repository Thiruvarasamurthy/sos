let userLat = null;
let userLng = null;

// ==========================
// INIT LOCATION
// ==========================
function initLocation() {
    console.log("Location init started");

    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;

            console.log("Location:", userLat, userLng);

            document.getElementById("main-map").src =
                https://www.google.com/maps?q=${userLat},${userLng}&output=embed;

            const status = document.getElementById("status-display");
            status.innerText = "Live location detected ✔";
            status.style.color = "#16a34a";
        },
        function () {
            alert("Please allow location access");
        },
        { enableHighAccuracy: true }
    );
}

// ==========================
// OPEN SERVICE PAGE
// ==========================
function findService(type) {
    console.log("Button clicked:", type);

    if (userLat === null || userLng === null) {
        alert("Location not ready yet");
        return;
    }

    let query = "";

    if (type === "police") query = "police station near me";
    if (type === "hospital") query = "hospital near me";
    if (type === "hotel") query = "hotels near me";

    const url =
        "https://www.google.com/maps/search/" +
        encodeURIComponent(query) +
        "/@" + userLat + "," + userLng + ",15z";

    console.log("Opening:", url);

    // FORCE navigation (works always)
    window.location.href = url;
}

// ==========================
// SOS FUNCTION
// ==========================
function activateEmergency() {
    console.log("SOS pressed");

    if (userLat === null || userLng === null) {
        alert("Location not ready");
        return;
    }

    const link = https://www.google.com/maps?q=${userLat},${userLng};

    alert("🚨 EMERGENCY ALERT\n\nLocation:\n" + link);

    findService("police");
}

// ==========================
window.onload = initLocation;