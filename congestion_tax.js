/**
 * Stockholm trängselskatt-beräkning.
 * Portad från congestion_tax.py — samma stationer, taxor och logik.
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

const DETECTION_RADIUS_M = 60;
const MAX_DAILY_SEK = 135;

// [start_hhmm, end_hhmm, sek]
const RATES = [
  [600,  629,  15],
  [630,  659,  25],
  [700,  829,  35],
  [830,  859,  25],
  [900,  929,  15],
  [930,  1459, 11],
  [1500, 1529, 15],
  [1530, 1559, 25],
  [1600, 1729, 35],
  [1730, 1759, 25],
  [1800, 1829, 15],
];

function ctGetRate(date) {
  const day = date.getDay(); // 0=sön, 6=lör
  if (day === 0 || day === 6) return 0;
  const t = date.getHours() * 100 + date.getMinutes();
  for (const [start, end, rate] of RATES) {
    if (t >= start && t <= end) return rate;
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
    this.passedStations = new Set();
    this.passedGroups   = new Set();
    this.passages       = [];
  }

  /** Anropas för varje ny GPS-punkt. Returnerar passage-objekt om station passerades, annars null. */
  checkPoint(lat, lng, timestamp) {
    let newPassage = null;

    for (const station of TOLL_STATIONS) {
      if (this.passedStations.has(station.name)) continue;
      if (ctHaversineM(lat, lng, station.lat, station.lng) > DETECTION_RADIUS_M) continue;

      this.passedStations.add(station.name);
      const rate = ctGetRate(timestamp);
      if (rate === 0) continue;

      let sek  = 0;
      let note = null;

      if (this.passedGroups.has(station.group)) {
        note = "Ingår i Essingeleden-passage";
      } else {
        this.passedGroups.add(station.group);
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
    return Math.min(
      this.passages.reduce((sum, p) => sum + p.sek, 0),
      MAX_DAILY_SEK
    );
  }
}
