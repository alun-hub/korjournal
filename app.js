// --- Persistent settings ---
let settings     = loadSettings();
let MILEAGE_RATE = settings.mileageRate;

// --- State ---
let map, polyline, posMarker;
let watchId      = null;
let recording    = false;
let currentTrip  = null;
let taxTracker   = null;
let timerInterval= null;
let lastPos      = null;
let wakeLock     = null;

// Trip type
let currentTripType = "tjänst";

// Selection state
let selectionMode   = false;
let selectedTripIds = new Set();

// --- Settings persistence ---
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("korjournal_settings") || "{}");
    return {
      mileageRate:    s.mileageRate    ?? 2.50,
      mapZoom:        s.mapZoom        ?? 12,
      mapOrientation: s.mapOrientation ?? "north",
      schedule: {
        businessDays: s.schedule?.businessDays ?? [1, 2, 3, 4, 5],
        startTime:    s.schedule?.startTime    ?? "07:00",
        endTime:      s.schedule?.endTime      ?? "18:00",
      },
    };
  } catch {
    return {
      mileageRate: 2.50, mapZoom: 12, mapOrientation: "north",
      schedule: { businessDays: [1, 2, 3, 4, 5], startTime: "07:00", endTime: "18:00" },
    };
  }
}

function saveSettings() {
  localStorage.setItem("korjournal_settings", JSON.stringify(settings));
}

function getDefaultTripType() {
  const now  = new Date();
  const day  = now.getDay();
  const hhmm = now.toTimeString().slice(0, 5);
  const { businessDays, startTime, endTime } = settings.schedule;
  return (businessDays.includes(day) && hhmm >= startTime && hhmm < endTime)
    ? "tjänst" : "privat";
}

function setTripType(type) {
  currentTripType = type;
  document.getElementById("type-privat").classList.toggle("active", type === "privat");
  document.getElementById("type-tjänst").classList.toggle("active", type === "tjänst");
}

// --- Map init ---
function initMap() {
  map = L.map("map", { zoomControl: false }).setView([59.334, 18.065], settings.mapZoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(map);
}

// --- Recording ---
function startRecording() {
  if (!navigator.geolocation) {
    showToast("GPS stöds inte av denna webbläsare.", true);
    return;
  }

  recording    = true;
  currentTrip  = {
    id:          Date.now(),
    startTime:   new Date().toISOString(),
    endTime:     null,
    points:      [],
    distanceKm:  0,
    passages:    [],
    totalToll:   0,
    note:        "",
    type:        currentTripType,
  };
  taxTracker = new CongestionTaxTracker();
  lastPos    = null;

  if (polyline) { map.removeLayer(polyline); polyline = null; }
  polyline = L.polyline([], { color: "#3b82f6", weight: 5, opacity: 0.9 }).addTo(map);

  setUiRecording(true);
  acquireWakeLock();

  timerInterval = setInterval(updateTimer, 1000);

  watchId = navigator.geolocation.watchPosition(onPosition, onGpsError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
}

function stopRecording() {
  recording = false;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  clearInterval(timerInterval);
  timerInterval = null;
  releaseWakeLock();

  if (!currentTrip || currentTrip.points.length < 2) {
    showToast("För lite data — inga punkter sparades.");
    resetUI();
    return;
  }

  currentTrip.endTime   = new Date().toISOString();
  currentTrip.passages  = taxTracker.passages;
  currentTrip.totalToll = taxTracker.getTotal();

  showSummary(currentTrip);
}

// --- GPS callback ---
function onPosition(pos) {
  const { latitude: lat, longitude: lng, heading } = pos.coords;
  const timestamp = new Date(pos.timestamp);

  // Position marker
  if (!posMarker) {
    posMarker = L.circleMarker([lat, lng], {
      radius: 9, color: "#fff", weight: 2,
      fillColor: "#3b82f6", fillOpacity: 1,
    }).addTo(map);
  } else {
    posMarker.setLatLng([lat, lng]);
  }
  map.panTo([lat, lng]);

  // Kartorientering — kurs upp
  if (settings.mapOrientation === "heading" && heading != null && !isNaN(heading)) {
    document.getElementById("map").style.transform = `rotate(${-heading}deg)`;
  }

  if (!recording) return;

  currentTrip.points.push({ lat, lng, ts: timestamp.toISOString() });
  polyline.addLatLng([lat, lng]);

  // Distance — filter GPS-jitter < 8m
  if (lastPos) {
    const d = haversineM(lastPos.lat, lastPos.lng, lat, lng);
    if (d > 8) {
      currentTrip.distanceKm += d / 1000;
      document.getElementById("stat-km").textContent = currentTrip.distanceKm.toFixed(1);
    }
  }
  lastPos = { lat, lng };

  // Trängselskatt
  const passage = taxTracker.checkPoint(lat, lng, timestamp);
  if (passage && passage.sek > 0) {
    document.getElementById("stat-toll").textContent = taxTracker.getTotal();
    showToast(`${passage.station} — +${passage.sek} kr`);
  }
}

function onGpsError(err) {
  document.getElementById("status-text").textContent = "GPS-fel — kontrollera behörigheter";
}

// --- Timer ---
function updateTimer() {
  if (!currentTrip) return;
  const elapsed = Math.floor((Date.now() - new Date(currentTrip.startTime)) / 1000);
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  document.getElementById("stat-time").textContent = `${m}:${s}`;
}

// --- Summary modal ---
function showSummary(trip) {
  const start = new Date(trip.startTime);
  const end   = new Date(trip.endTime);

  const dateStr    = start.toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr    = `${fmtTime(start)} – ${fmtTime(end)}`;
  const km         = trip.distanceKm.toFixed(1);
  const mileage    = Math.round(trip.distanceKm * MILEAGE_RATE);
  const total      = mileage + trip.totalToll;

  document.getElementById("sum-date").textContent    = dateStr;
  document.getElementById("sum-time").textContent    = timeStr;
  document.getElementById("sum-km").textContent      = `${km} km`;
  document.getElementById("sum-mileage").textContent = `${mileage} kr  (${MILEAGE_RATE.toFixed(2)} kr/km)`;
  document.getElementById("sum-total").textContent   = `${total} kr`;

  const tollSection = document.getElementById("sum-toll-section");
  if (trip.passages.length > 0) {
    tollSection.style.display = "flex";
    document.getElementById("sum-toll").textContent = `${trip.totalToll} kr`;
    document.getElementById("sum-toll-list").innerHTML = trip.passages
      .map(p => `<div class="toll-item">${p.time} — ${p.station}${p.sek > 0 ? ` (+${p.sek} kr)` : ` (${p.note})`}</div>`)
      .join("");
  } else {
    tollSection.style.display = "none";
  }

  document.getElementById("trip-note").value = "";
  document.getElementById("summary-modal").classList.add("show");
}

function saveTrip() {
  currentTrip.note = document.getElementById("trip-note").value.trim();
  const trips = getTrips();
  trips.unshift(currentTrip);
  localStorage.setItem("korjournal_trips", JSON.stringify(trips));
  document.getElementById("summary-modal").classList.remove("show");
  resetUI();
  showToast("Resa sparad!");
}

function discardTrip() {
  document.getElementById("summary-modal").classList.remove("show");
  resetUI();
}

// --- History ---
function showHistory() {
  exitSelectionMode();
  renderTripList();
  updateSummaryBar();
  document.getElementById("history-screen").style.display = "flex";
}

function renderTripList() {
  const trips = getTrips();
  const list  = document.getElementById("trip-list");

  if (trips.length === 0) {
    list.innerHTML = '<div class="empty-state">Inga resor sparade ännu.<br>Starta din första körning!</div>';
    return;
  }

  const canShare = typeof navigator.share === "function" || typeof navigator.clipboard !== "undefined";

  list.innerHTML = trips.map((t) => {
    const start    = new Date(t.startTime);
    const end      = new Date(t.endTime);
    const dateStr  = start.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
    const timeStr  = `${fmtTime(start)} – ${fmtTime(end)}`;
    const mileage  = Math.round(t.distanceKm * MILEAGE_RATE);
    const total    = mileage + t.totalToll;
    const isChecked = selectedTripIds.has(t.id) ? " checked" : "";

    const passagesHtml = t.passages && t.passages.length > 0
      ? `<div class="trip-passages">${t.passages.map(p =>
          `<div class="trip-passage-item">${p.time} ${p.station}${p.sek > 0 ? ` <span class="passage-sek">+${p.sek} kr</span>` : ` <span class="passage-note">${p.note}</span>`}</div>`
        ).join("")}</div>`
      : "";

    const tripType  = t.type || "tjänst";
    const typeBadge = `<span class="type-badge ${tripType}">${tripType === "tjänst" ? "Tjänst" : "Privat"}</span>`;

    const cardContent = `
      <div class="trip-card-content">
        <div class="trip-meta">${dateStr} · ${timeStr}${typeBadge}</div>
        ${t.note ? `<div class="trip-note-label">${t.note}</div>` : ""}
        <div class="trip-row">
          <div>
            <div class="trip-km">${t.distanceKm.toFixed(1)} km</div>
            <div class="trip-sub">${t.totalToll > 0 ? `Trängselskatt: ${t.totalToll} kr` : "Ingen trängselskatt"}</div>
          </div>
          <div class="trip-amount">${total} kr</div>
        </div>
        ${passagesHtml}
        ${!selectionMode ? `<div class="trip-actions">
          ${t.points && t.points.length >= 2 ? `<button class="trip-icon-btn" data-action="route" data-id="${t.id}" title="Visa rutt">&#128506;</button>` : ""}
          ${canShare ? `<button class="trip-icon-btn" data-action="share" data-id="${t.id}" title="Dela">&#128279;</button>` : ""}
          <button class="trip-icon-btn" data-action="delete" data-id="${t.id}" title="Radera">&#128465;</button>
        </div>` : ""}
      </div>`;

    if (selectionMode) {
      return `<div class="trip-card selectable" data-id="${t.id}">
        <input type="checkbox" class="trip-checkbox" data-id="${t.id}"${isChecked}>
        ${cardContent}
      </div>`;
    } else {
      return `<div class="trip-card" data-id="${t.id}">${cardContent}</div>`;
    }
  }).join("");
}

// --- Summary bar ---
function updateSummaryBar() {
  const bar   = document.getElementById("history-summary-bar");
  const trips = getTrips();
  if (trips.length === 0) { bar.textContent = ""; return; }

  const totalKm  = trips.reduce((s, t) => s + t.distanceKm, 0);
  const totalKr  = trips.reduce((s, t) => s + Math.round(t.distanceKm * MILEAGE_RATE) + t.totalToll, 0);
  bar.textContent = `${trips.length} resor · ${totalKm.toFixed(1)} km · ${totalKr} kr totalt`;
}

// --- CSV helpers ---
function buildCSVRows(trips) {
  const rows = [["Datum", "Starttid", "Sluttid", "Typ", "Kilometer", "Milersättning (kr)", "Trängselskatt (kr)", "Totalt (kr)", "Anteckning"]];
  for (const t of trips) {
    const start   = new Date(t.startTime);
    const end     = new Date(t.endTime);
    const mileage = Math.round(t.distanceKm * MILEAGE_RATE);
    rows.push([
      start.toLocaleDateString("sv-SE"),
      fmtTime(start),
      fmtTime(end),
      (t.type || "tjänst") === "privat" ? "Privat" : "Tjänst",
      t.distanceKm.toFixed(1),
      mileage,
      t.totalToll,
      mileage + t.totalToll,
      t.note || "",
    ]);
  }
  return rows;
}

function downloadCSV(rows, filename) {
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const trips = getTrips();
  if (trips.length === 0) return;
  downloadCSV(buildCSVRows(trips), `korjournal_${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportSelectedCSV() {
  const trips = getTrips().filter(t => selectedTripIds.has(t.id));
  if (trips.length === 0) return;
  downloadCSV(buildCSVRows(trips), `korjournal_urval_${new Date().toISOString().slice(0, 10)}.csv`);
}

// --- Share ---
function tripToShareText(trip) {
  const start   = new Date(trip.startTime);
  const end     = new Date(trip.endTime);
  const mileage = Math.round(trip.distanceKm * MILEAGE_RATE);
  const total   = mileage + trip.totalToll;
  const lines   = [
    `Körjournal ${start.toLocaleDateString("sv-SE")}`,
    `Tid: ${fmtTime(start)}–${fmtTime(end)}`,
    `Sträcka: ${trip.distanceKm.toFixed(1)} km`,
    `Milersättning: ${mileage} kr`,
    trip.totalToll > 0 ? `Trängselskatt: ${trip.totalToll} kr` : null,
    `Totalt: ${total} kr`,
    trip.note ? `Anteckning: ${trip.note}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

async function shareSingleTrip(tripId) {
  const trip = getTrips().find(t => t.id === tripId);
  if (!trip) return;

  const text = tripToShareText(trip);
  const filename = `korjournal_${new Date(trip.startTime).toISOString().slice(0, 10)}.csv`;

  try {
    if (navigator.share) {
      const rows = buildCSVRows([trip]);
      const csv  = rows.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
      const file = new File(["\uFEFF" + csv], filename, { type: "text/csv" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Körjournal", text, files: [file] });
      } else {
        await navigator.share({ title: "Körjournal", text });
      }
      return;
    }
  } catch (err) {
    if (err.name === "AbortError") return;
  }

  // Fallback: copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    showToast("Kopierat till urklipp");
  } else {
    showToast("Delning stöds inte i denna webbläsare", true);
  }
}

async function shareSelectedTrip() {
  const ids   = [...selectedTripIds];
  if (ids.length !== 1) return;
  await shareSingleTrip(ids[0]);
}

// --- Delete ---
function deleteSingleTrip(id) {
  if (!window.confirm("Radera denna resa?")) return;
  const trips = getTrips().filter(t => t.id !== id);
  localStorage.setItem("korjournal_trips", JSON.stringify(trips));
  showHistory();
}

function deleteSelectedTrips() {
  const n = selectedTripIds.size;
  if (!window.confirm(`Radera ${n} markerade resa${n !== 1 ? "r" : ""}?`)) return;
  const trips = getTrips().filter(t => !selectedTripIds.has(t.id));
  localStorage.setItem("korjournal_trips", JSON.stringify(trips));
  exitSelectionMode();
  showHistory();
}

// --- Selection mode ---
function enterSelectionMode() {
  selectionMode = true;
  selectedTripIds.clear();
  document.getElementById("select-mode-btn").classList.add("active");
  document.getElementById("history-footer").style.display = "none";
  document.getElementById("selection-footer").style.display = "flex";
  renderTripList();
  updateSelectionFooter();
}

function exitSelectionMode() {
  selectionMode = false;
  selectedTripIds.clear();
  document.getElementById("select-mode-btn").classList.remove("active");
  document.getElementById("history-footer").style.display = "";
  document.getElementById("selection-footer").style.display = "none";
  renderTripList();
}

function toggleSelectionMode() {
  selectionMode ? exitSelectionMode() : enterSelectionMode();
}

function updateSelectionFooter() {
  const n = selectedTripIds.size;
  document.getElementById("sel-export-btn").textContent = `Exportera (${n})`;
  document.getElementById("sel-delete-btn").textContent = `Radera (${n})`;
  const shareBtn = document.getElementById("sel-share-btn");
  if (n === 1 && (typeof navigator.share === "function" || navigator.clipboard)) {
    shareBtn.style.display = "";
  } else {
    shareBtn.style.display = "none";
  }
}

// --- Route view ---
let routePolyline = null;
let routeMarkers  = [];

function showRoute(tripId) {
  const trip = getTrips().find(t => t.id === tripId);
  if (!trip || !trip.points || trip.points.length < 2) return;

  document.getElementById("history-screen").style.display = "none";

  // Rensa tidigare ruttvisning
  if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
  routeMarkers.forEach(m => map.removeLayer(m));
  routeMarkers = [];

  const latlngs = trip.points.map(p => [p.lat, p.lng]);

  routePolyline = L.polyline(latlngs, { color: "#3b82f6", weight: 5, opacity: 0.9 }).addTo(map);

  // Startpunkt (grön) och slutpunkt (röd)
  routeMarkers.push(
    L.circleMarker(latlngs[0], {
      radius: 7, color: "#fff", weight: 2, fillColor: "#22c55e", fillOpacity: 1,
    }).addTo(map),
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 7, color: "#fff", weight: 2, fillColor: "#ef4444", fillOpacity: 1,
    }).addTo(map)
  );

  map.fitBounds(routePolyline.getBounds(), { padding: [60, 24] });

  const start   = new Date(trip.startTime);
  const end     = new Date(trip.endTime);
  const dateStr = start.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
  const mileage = Math.round(trip.distanceKm * MILEAGE_RATE);
  document.getElementById("route-info").textContent =
    `${dateStr} · ${fmtTime(start)}–${fmtTime(end)} · ${trip.distanceKm.toFixed(1)} km · ${mileage + trip.totalToll} kr`;

  document.getElementById("route-overlay").style.display = "block";
}

function hideRoute() {
  document.getElementById("route-overlay").style.display = "none";
  if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
  routeMarkers.forEach(m => map.removeLayer(m));
  routeMarkers = [];
  showHistory();
}

// --- Wake Lock ---
async function acquireWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      // Återaktivera om inspelning fortfarande pågår (t.ex. efter skärmlås)
      if (recording) acquireWakeLock();
    });
  } catch (_) {}
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

// Återaktivera när fliken blir synlig igen, varna om GPS-gap
let hiddenAt = null;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (recording) hiddenAt = Date.now();
  } else {
    if (recording && hiddenAt) {
      const gapS = Math.round((Date.now() - hiddenAt) / 1000);
      if (gapS >= 5) showToast(`⚠ Appen var i bakgrunden ${gapS} s — GPS-data kan saknas`, true);
    }
    hiddenAt = null;
    if (recording) acquireWakeLock();
  }
});

// --- Settings ---
function resetMapRotation() {
  document.getElementById("map").style.transform = "";
}

function applySettings() {
  const val = parseFloat(document.getElementById("rate-input").value);
  if (!isNaN(val) && val > 0) {
    MILEAGE_RATE = val;
    settings.mileageRate = val;
  }

  const orient = document.getElementById("orientation-select").value;
  if (orient !== settings.mapOrientation) {
    settings.mapOrientation = orient;
    if (orient === "north") resetMapRotation();
  }

  const zoom = parseInt(document.getElementById("zoom-select").value);
  if (!isNaN(zoom)) {
    settings.mapZoom = zoom;
    map.setZoom(zoom);
  }

  const activeDays = Array.from(document.querySelectorAll(".day-btn.active"))
    .map(btn => parseInt(btn.dataset.day));
  settings.schedule.businessDays = activeDays;
  settings.schedule.startTime = document.getElementById("sched-start").value || "07:00";
  settings.schedule.endTime   = document.getElementById("sched-end").value   || "18:00";

  saveSettings();
  setTripType(getDefaultTripType());
  document.getElementById("settings-panel").style.display = "none";
  showToast("Inställningar sparade");
}

// --- Helpers ---
function haversineM(lat1, lng1, lat2, lng2) {
  const R    = 6_371_000;
  const toR  = (x) => x * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function fmtTime(d) {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function showToast(msg, isError = false) {
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " toast-error" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function getTrips() {
  return JSON.parse(localStorage.getItem("korjournal_trips") || "[]");
}

function setUiRecording(on) {
  document.getElementById("record-btn").className = on ? "recording" : "idle";
  document.getElementById("record-btn").textContent = on ? "Stoppa körning" : "Starta körning";
  document.getElementById("rec-dot").className = "dot" + (on ? " recording" : "");
  document.getElementById("status-text").textContent = on ? "Spelar in…" : "Redo att starta";
  if (!on) {
    document.getElementById("stat-km").textContent   = "0.0";
    document.getElementById("stat-time").textContent  = "00:00";
    document.getElementById("stat-toll").textContent  = "0";
  }
}

function resetUI() {
  currentTrip = null;
  setUiRecording(false);
}

// --- Month report ---
function showMonthReport() {
  const trips = getTrips();
  const monthKeys = [...new Set(trips.map(t => t.startTime.slice(0, 7)))].sort().reverse();

  const sel = document.getElementById("report-month-select");
  while (sel.firstChild) sel.removeChild(sel.firstChild);

  if (monthKeys.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Inga resor";
    sel.appendChild(opt);
    document.getElementById("report-content").textContent = "";
  } else {
    monthKeys.forEach(k => {
      const [year, month] = k.split("-");
      const label = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("sv-SE", { year: "numeric", month: "long" });
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = label;
      sel.appendChild(opt);
    });
    renderMonthReport(monthKeys[0]);
  }

  document.getElementById("report-modal").classList.add("show");
}

function closeMonthReport() {
  document.getElementById("report-modal").classList.remove("show");
}

function renderMonthReport(monthKey) {
  if (!monthKey) return;
  const all = getTrips().filter(t => t.startTime.startsWith(monthKey));
  const container = document.getElementById("report-content");
  while (container.firstChild) container.removeChild(container.firstChild);

  const byType = { "tjänst": [], "privat": [] };
  for (const t of all) {
    const key = (t.type || "tjänst") === "privat" ? "privat" : "tjänst";
    byType[key].push(t);
  }

  function addSection(label, trips) {
    if (trips.length === 0) return;
    const section = document.createElement("div");
    section.className = "report-section";

    const title = document.createElement("div");
    title.className = "report-section-title";
    title.textContent = `${label} — ${trips.length} resa${trips.length !== 1 ? "r" : ""}`;
    section.appendChild(title);

    const km      = trips.reduce((s, t) => s + t.distanceKm, 0);
    const mileage = trips.reduce((s, t) => s + Math.round(t.distanceKm * MILEAGE_RATE), 0);
    const toll    = trips.reduce((s, t) => s + t.totalToll, 0);
    const total   = mileage + toll;

    const lines = [
      ["Sträcka", `${km.toFixed(1)} km`],
      ["Milersättning", `${mileage} kr`],
    ];
    if (toll > 0) lines.push(["Trängselskatt", `${toll} kr`]);
    lines.push(["Delsumma", `${total} kr`]);

    lines.forEach(([lbl, val], i) => {
      const row = document.createElement("div");
      row.className = "report-line";
      if (i === lines.length - 1) row.style.fontWeight = "600";
      const lspan = document.createElement("span");
      lspan.className = "rl-label";
      lspan.textContent = lbl;
      const vspan = document.createElement("span");
      vspan.textContent = val;
      row.appendChild(lspan);
      row.appendChild(vspan);
      section.appendChild(row);
    });

    container.appendChild(section);
  }

  addSection("Tjänst", byType["tjänst"]);
  addSection("Privat", byType["privat"]);

  const totalTrips = all.length;
  const totalKm    = all.reduce((s, t) => s + t.distanceKm, 0);
  const totalKr    = all.reduce((s, t) => s + Math.round(t.distanceKm * MILEAGE_RATE) + t.totalToll, 0);

  const summary = document.createElement("div");
  summary.className = "report-total";
  summary.textContent = `${totalTrips} resor · ${totalKm.toFixed(1)} km · ${totalKr} kr totalt`;
  container.appendChild(summary);
}

function exportMonthCSV() {
  const monthKey = document.getElementById("report-month-select").value;
  if (!monthKey) return;
  const trips = getTrips().filter(t => t.startTime.startsWith(monthKey));
  if (trips.length === 0) return;
  downloadCSV(buildCSVRows(trips), `korjournal_${monthKey}.csv`);
}

// --- Event listeners ---
document.getElementById("record-btn").addEventListener("click", () => {
  recording ? stopRecording() : startRecording();
});

document.getElementById("history-btn").addEventListener("click", showHistory);

document.getElementById("back-btn").addEventListener("click", () => {
  document.getElementById("history-screen").style.display = "none";
});

document.getElementById("btn-save").addEventListener("click", saveTrip);
document.getElementById("btn-discard").addEventListener("click", discardTrip);
document.getElementById("export-btn").addEventListener("click", exportCSV);

document.getElementById("settings-btn").addEventListener("click", () => {
  document.getElementById("rate-input").value = MILEAGE_RATE.toFixed(2);
  document.getElementById("zoom-select").value = settings.mapZoom;
  document.getElementById("orientation-select").value = settings.mapOrientation;
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.classList.toggle("active", settings.schedule.businessDays.includes(parseInt(btn.dataset.day)));
  });
  document.getElementById("sched-start").value = settings.schedule.startTime;
  document.getElementById("sched-end").value   = settings.schedule.endTime;
  const panel = document.getElementById("settings-panel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});
document.getElementById("rate-apply").addEventListener("click", applySettings);

document.getElementById("select-mode-btn").addEventListener("click", toggleSelectionMode);

// Delegated listener on trip list (change + click)
document.getElementById("trip-list").addEventListener("change", (e) => {
  if (!e.target.classList.contains("trip-checkbox")) return;
  const id = Number(e.target.dataset.id);
  if (e.target.checked) {
    selectedTripIds.add(id);
  } else {
    selectedTripIds.delete(id);
  }
  updateSelectionFooter();
});

document.getElementById("trip-list").addEventListener("click", (e) => {
  // Icon buttons (normal mode)
  const iconBtn = e.target.closest(".trip-icon-btn");
  if (iconBtn) {
    e.stopPropagation();
    const id = Number(iconBtn.dataset.id);
    if (iconBtn.dataset.action === "route")  showRoute(id);
    if (iconBtn.dataset.action === "share")  shareSingleTrip(id);
    if (iconBtn.dataset.action === "delete") deleteSingleTrip(id);
    return;
  }

  // Card click in selection mode toggles checkbox
  if (selectionMode) {
    const card = e.target.closest(".trip-card");
    if (!card) return;
    const id  = Number(card.dataset.id);
    const cb  = card.querySelector(".trip-checkbox");
    if (!cb) return;
    cb.checked = !cb.checked;
    if (cb.checked) { selectedTripIds.add(id); } else { selectedTripIds.delete(id); }
    updateSelectionFooter();
  }
});

document.getElementById("route-back-btn").addEventListener("click", hideRoute);
document.getElementById("sel-export-btn").addEventListener("click", exportSelectedCSV);
document.getElementById("sel-share-btn").addEventListener("click", shareSelectedTrip);
document.getElementById("sel-delete-btn").addEventListener("click", deleteSelectedTrips);

document.getElementById("type-privat").addEventListener("click", () => setTripType("privat"));
document.getElementById("type-tjänst").addEventListener("click", () => setTripType("tjänst"));

document.getElementById("report-btn").addEventListener("click", showMonthReport);
document.getElementById("report-close-btn").addEventListener("click", closeMonthReport);
document.getElementById("report-export-btn").addEventListener("click", exportMonthCSV);
document.getElementById("report-month-select").addEventListener("change", e => renderMonthReport(e.target.value));

document.getElementById("sched-days").addEventListener("click", e => {
  const btn = e.target.closest(".day-btn");
  if (btn) btn.classList.toggle("active");
});

// --- Init ---
initMap();
currentTripType = getDefaultTripType();
setTripType(currentTripType);

// --- Service Worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});

    // När ny SW tagit över — ladda om för att få nya filer
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recording) {
        showToast("Ny version tillgänglig — starta om appen efter körningen");
      } else {
        window.location.reload();
      }
    });
  });
}
