/**
 * Stockholm trängselskatt-beräkning.
 * Källa: Transportstyrelsen (https://www.transportstyrelsen.se/sv/vagtrafik/fordon/skatter-och-avgifter/trangselskatt/trangselskatt-i-stockholm/)
 */

// Alla sensorpositioner från Trafikverkets officiella GeoPackage (Betalstationer_70525.gpkg).
// Varje rad = en fysisk sensor (CP-nummer). Samma stationsnamn på flera rader = olika körfält/ramper.
// passedStations-setet förhindrar dubbeldebitering om flera sensorer för samma station triggas.
const TOLL_STATIONS = [
  // ── Inre tullen (kordon runt innerstaden) ──────────────────────────────────
  { name: "Danvikstull",       lat: 59.31402, lng: 18.10351, group: "city" }, // CP 271
  { name: "Danvikstull",       lat: 59.31392, lng: 18.10344, group: "city" }, // CP 272
  { name: "Skansbron",         lat: 59.30403, lng: 18.07943, group: "city" }, // CP 281
  { name: "Skansbron",         lat: 59.30404, lng: 18.07942, group: "city" }, // CP 282
  { name: "Skanstullsbron",    lat: 59.30633, lng: 18.07747, group: "city" }, // CP 291
  { name: "Skanstullsbron",    lat: 59.30630, lng: 18.07727, group: "city" }, // CP 292
  { name: "Johanneshovsbron",  lat: 59.30381, lng: 18.07720, group: "city" }, // CP 301
  { name: "Johanneshovsbron",  lat: 59.30378, lng: 18.07705, group: "city" }, // CP 302
  { name: "Liljeholmsbron",    lat: 59.31144, lng: 18.02883, group: "city" }, // CP 311
  { name: "Liljeholmsbron",    lat: 59.31196, lng: 18.02922, group: "city" }, // CP 312
  { name: "Ekelundsbron",      lat: 59.34062, lng: 18.01293, group: "city" }, // CP 361
  { name: "Ekelundsbron",      lat: 59.34061, lng: 18.01292, group: "city" }, // CP 362
  { name: "Klarastrandsleden", lat: 59.33877, lng: 18.02990, group: "city" }, // CP 371
  { name: "Klarastrandsleden", lat: 59.33881, lng: 18.02994, group: "city" }, // CP 372
  { name: "Tomtebodavägen",    lat: 59.34368, lng: 18.02609, group: "city" }, // CP 381
  { name: "Tomtebodavägen",    lat: 59.34375, lng: 18.02620, group: "city" }, // CP 382
  { name: "Solnabron",         lat: 59.34659, lng: 18.03225, group: "city" }, // CP 391
  { name: "Solnabron",         lat: 59.34680, lng: 18.03213, group: "city" }, // CP 392
  { name: "Norrtull",          lat: 59.34976, lng: 18.04264, group: "city" }, // CP 401
  { name: "Norrtull",          lat: 59.35040, lng: 18.04396, group: "city" }, // CP 402
  { name: "Norrtull",          lat: 59.34971, lng: 18.04250, group: "city" }, // CP 403
  { name: "Ekhagen",           lat: 59.37114, lng: 18.05030, group: "city" }, // CP 411
  { name: "Ekhagen",           lat: 59.37142, lng: 18.05086, group: "city" }, // CP 412
  { name: "Ekhagen",           lat: 59.36935, lng: 18.05155, group: "city" }, // CP 413
  { name: "Ekhagen",           lat: 59.36949, lng: 18.05069, group: "city" }, // CP 414
  { name: "Frescati",          lat: 59.36562, lng: 18.05248, group: "city" }, // CP 421
  { name: "Frescati",          lat: 59.36562, lng: 18.05245, group: "city" }, // CP 422
  { name: "Universitetet",     lat: 59.36298, lng: 18.05463, group: "city" }, // CP 431
  { name: "Universitetet",     lat: 59.36311, lng: 18.05520, group: "city" }, // CP 432
  { name: "Roslagstull",       lat: 59.35277, lng: 18.05801, group: "city" }, // CP 441
  { name: "Roslagstull",       lat: 59.35248, lng: 18.05873, group: "city" }, // CP 442
  { name: "Värtan",            lat: 59.35120, lng: 18.09525, group: "city" }, // CP 451
  { name: "Värtan",            lat: 59.35142, lng: 18.09564, group: "city" }, // CP 452
  { name: "Värtan",            lat: 59.35259, lng: 18.10646, group: "city" }, // CP 453
  { name: "Värtan",            lat: 59.35179, lng: 18.10658, group: "city" }, // CP 454
  { name: "Värtan",            lat: 59.35079, lng: 18.09934, group: "city" }, // CP 455
  { name: "Värtan",            lat: 59.35259, lng: 18.10651, group: "city" }, // CP 456
  { name: "Ropsten",           lat: 59.35659, lng: 18.10511, group: "city" }, // CP 461
  { name: "Ropsten",           lat: 59.35665, lng: 18.10499, group: "city" }, // CP 462
  { name: "Ropsten",           lat: 59.35697, lng: 18.10243, group: "city" }, // CP 463
  { name: "Ropsten",           lat: 59.35690, lng: 18.10238, group: "city" }, // CP 464
  { name: "Hälsingegatan",     lat: 59.34909, lng: 18.03621, group: "city" }, // CP 471
  { name: "Hälsingegatan",     lat: 59.34905, lng: 18.03624, group: "city" }, // CP 472
  { name: "Hagastaden",        lat: 59.34769, lng: 18.03304, group: "city" }, // CP 473
  { name: "Hagastaden",        lat: 59.34767, lng: 18.03306, group: "city" }, // CP 474

  // ── Essingeleden — max en avgift per passage oavsett antal stationer ───────
  { name: "Stora Essingen",    lat: 59.32290, lng: 17.99668, group: "essingeleden" }, // CP 321
  { name: "Stora Essingen",    lat: 59.32289, lng: 17.99657, group: "essingeleden" }, // CP 322
  { name: "Stora Essingen",    lat: 59.32206, lng: 17.99630, group: "essingeleden" }, // CP 323
  { name: "Lilla Essingen",    lat: 59.32511, lng: 18.00399, group: "essingeleden" }, // CP 332
  { name: "Fredhäll",          lat: 59.33119, lng: 18.01097, group: "essingeleden" }, // CP 341
  { name: "Fredhäll",          lat: 59.33150, lng: 18.01059, group: "essingeleden" }, // CP 342
  { name: "Fredhäll",          lat: 59.33067, lng: 18.01054, group: "essingeleden" }, // CP 343
  { name: "Fredhäll",          lat: 59.33136, lng: 18.01065, group: "essingeleden" }, // CP 344
  { name: "Fredhäll",          lat: 59.33126, lng: 18.00894, group: "essingeleden" }, // CP 345
  { name: "Fredhäll",          lat: 59.33166, lng: 18.01056, group: "essingeleden" }, // CP 346
  { name: "Fredhäll",          lat: 59.33373, lng: 18.00973, group: "essingeleden" }, // CP 347
  { name: "Fredhäll",          lat: 59.33372, lng: 18.00990, group: "essingeleden" }, // CP 348
  { name: "Kristineberg",      lat: 59.33645, lng: 18.01029, group: "essingeleden" }, // CP 351
  { name: "Kristineberg",      lat: 59.33618, lng: 18.01082, group: "essingeleden" }, // CP 352
  { name: "Kristineberg",      lat: 59.33372, lng: 18.01009, group: "essingeleden" }, // CP 353
  { name: "Kristineberg",      lat: 59.33374, lng: 18.00950, group: "essingeleden" }, // CP 354
];

const DETECTION_RADIUS_M = 10;

// Tidsluckor [start_hhmm, end_hhmm]
const TIME_SLOTS = [
  [600,  629],
  [630,  659],
  [700,  829],
  [830,  859],
  [900,  929],
  [930,  1459],
  [1500, 1529],
  [1530, 1559],
  [1600, 1729],
  [1730, 1759],
  [1800, 1829],
];

// Taxor per tidslucka: högsäsong / lågsäsong
// Högsäsong: 1 mars – dagen före midsommarafton, 15 aug – 30 nov
// Källa: Transportstyrelsen
const GROUP_RATES = {
  city: {
    peak:    [15, 30, 45, 30, 20, 11, 20, 30, 45, 30, 20],
    offpeak: [15, 25, 35, 25, 15, 11, 15, 25, 35, 25, 15],
  },
  essingeleden: {
    peak:    [15, 27, 40, 27, 20, 11, 20, 27, 40, 27, 20],
    offpeak: [15, 22, 30, 22, 15, 11, 15, 22, 30, 22, 15],
  },
};

const MAX_SEK = { peak: 135, offpeak: 105 };

// Midsommarafton = fredagen före midsommardagen (lördagen 20–26 juni)
function getMidsummerEve(year) {
  const june20 = new Date(year, 5, 20);
  const daysToSat = (6 - june20.getDay() + 7) % 7;
  return new Date(year, 5, 20 + daysToSat - 1);
}

function getSeason(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexerat
  const d = date.getDate();

  if (m === 0 || m === 1 || m === 11) return "offpeak"; // jan, feb, dec
  if (m >= 2 && m <= 4)              return "peak";     // mars, apr, maj
  if (m === 5) {                                         // juni
    return d < getMidsummerEve(y).getDate() ? "peak" : "offpeak";
  }
  if (m === 6) return "offpeak";                         // juli
  if (m === 7) return d >= 15 ? "peak" : "offpeak";     // aug
  if (m >= 8 && m <= 10) return "peak";                 // sep, okt, nov
  return "offpeak";
}

// Returnerar Set med datum för de 5 första vardagarna i juli
function getFirstFiveJulyWeekdays(year) {
  const days = new Set();
  const d = new Date(year, 6, 1);
  while (days.size < 5) {
    if (d.getDay() >= 1 && d.getDay() <= 5) days.add(d.getDate());
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function ctGetRate(date, group) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return 0; // helg

  const m = date.getMonth();
  // Juli: avgift tas bara ut de 5 första vardagarna
  if (m === 6 && !getFirstFiveJulyWeekdays(date.getFullYear()).has(date.getDate())) return 0;

  const t      = date.getHours() * 100 + date.getMinutes();
  const season = getSeason(date);
  const rates  = (GROUP_RATES[group] || GROUP_RATES.city)[season];

  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const [start, end] = TIME_SLOTS[i];
    if (t >= start && t <= end) return rates[i];
  }
  return 0;
}

function ctHaversineM(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

class CongestionTaxTracker {
  constructor() {
    this.passedStations    = new Set(); // förhindrar dubbeldebitering av samma station
    this.essingeledenCharged = false;   // max en avgift per Essingeleden-passage
    this.passages          = [];
    this.season            = null;
  }

  checkPoint(lat, lng, timestamp) {
    let newPassage = null;

    for (const station of TOLL_STATIONS) {
      if (this.passedStations.has(station.name)) continue;
      if (ctHaversineM(lat, lng, station.lat, station.lng) > DETECTION_RADIUS_M) continue;

      this.passedStations.add(station.name);
      const rate = ctGetRate(timestamp, station.group);
      if (rate === 0) continue;

      if (!this.season) this.season = getSeason(timestamp);

      let sek  = 0;
      let note = null;

      if (station.group === "essingeleden") {
        if (this.essingeledenCharged) {
          note = "Ingår i Essingeleden-passage";
        } else {
          this.essingeledenCharged = true;
          sek = rate;
        }
      } else {
        // Varje city-station debiteras separat
        sek = rate;
      }

      const timeStr = timestamp.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
      const passage = { station: station.name, time: timeStr, sek, note };
      this.passages.push(passage);
      newPassage = passage;
    }

    return newPassage;
  }

  getTotal() {
    const max = MAX_SEK[this.season || "offpeak"];
    return Math.min(
      this.passages.reduce((sum, p) => sum + p.sek, 0),
      max
    );
  }
}
