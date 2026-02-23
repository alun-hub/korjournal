/**
 * Stockholm trängselskatt-beräkning.
 * Källa: Transportstyrelsen (https://www.transportstyrelsen.se/sv/vagtrafik/fordon/skatter-och-avgifter/trangselskatt/trangselskatt-i-stockholm/)
 */

const TOLL_STATIONS = [
  // Inre tullen (kordon runt innerstaden)
  { name: "Danvikstull",         lat: 59.31295, lng: 18.06828, group: "city" },
  { name: "Johanneshovsbron",    lat: 59.30499, lng: 18.07624, group: "city" },
  { name: "Skanstullsbron",      lat: 59.30458, lng: 18.07844, group: "city" },
  { name: "Skansbron",           lat: 59.30368, lng: 18.07964, group: "city" },
  { name: "Liljeholmsbron",      lat: 59.31341, lng: 18.03231, group: "city" },
  { name: "Ekelundsbron",        lat: 59.34035, lng: 18.01281, group: "city" },
  { name: "Klarastrandsleden",   lat: 59.32932, lng: 18.05542, group: "city" },
  { name: "Tomtebodavägen",      lat: 59.34361, lng: 18.02692, group: "city" },
  { name: "Solnabron",           lat: 59.35869, lng: 18.00296, group: "city" },
  { name: "Norrtull",            lat: 59.34215, lng: 18.05191, group: "city" },
  { name: "Ekhagen",             lat: 59.35685, lng: 18.05597, group: "city" },
  { name: "Frescati",            lat: 59.37053, lng: 18.05034, group: "city" },
  { name: "Universitetet",       lat: 59.36179, lng: 18.05984, group: "city" },
  { name: "Roslagstull",         lat: 59.35160, lng: 18.05579, group: "city" },
  { name: "Ropsten",             lat: 59.35712, lng: 18.10240, group: "city" },
  { name: "Värtan",              lat: 59.35000, lng: 18.09900, group: "city" },
  { name: "Hagastaden",          lat: 59.34723, lng: 18.03372, group: "city" },
  // Essingeleden — max en avgift per passage oavsett antal stationer
  { name: "Fredhäll",            lat: 59.32796, lng: 18.00859, group: "essingeleden" },
  { name: "Kristineberg",        lat: 59.33330, lng: 18.00987, group: "essingeleden" },
  { name: "Tranebergsbron",      lat: 59.33351, lng: 17.99513, group: "essingeleden" },
  { name: "Stora Essingen",      lat: 59.32033, lng: 17.98833, group: "essingeleden" },
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
