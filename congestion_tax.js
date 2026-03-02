/**
 * Trängselskatt — Stockholm och Göteborg.
 * Källor: Transportstyrelsen
 *   Stockholm: https://www.transportstyrelsen.se/trangselskatt-stockholm
 *   Göteborg:  https://www.transportstyrelsen.se/trangselskatt-goteborg
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

  // ── Göteborg ───────────────────────────────────────────────────────────────
  // Positioner från Trafikverkets officiella GeoPackage (Betalstationer_Göteborg_84729.gpkg)
  // Konverterade från SWEREF99TM (EPSG:3006) till WGS84
  { name: "Fridkullagatan",                   lat: 57.68244, lng: 11.98761, group: "gbg" }, // CP 401
  { name: "Fridkullagatan",                   lat: 57.68243, lng: 11.98762, group: "gbg" }, // CP 402
  { name: "Gibraltargatan",                   lat: 57.68300, lng: 11.98449, group: "gbg" }, // CP 411
  { name: "Gibraltargatan",                   lat: 57.68297, lng: 11.98450, group: "gbg" }, // CP 412
  { name: "Doktor Allards gata",              lat: 57.68157, lng: 11.97867, group: "gbg" }, // CP 421
  { name: "Doktor Allards gata",              lat: 57.68158, lng: 11.97867, group: "gbg" }, // CP 422
  { name: "Ehrenströmsgatan",                 lat: 57.67917, lng: 11.96869, group: "gbg" }, // CP 431
  { name: "Ehrenströmsgatan",                 lat: 57.67920, lng: 11.96865, group: "gbg" }, // CP 432
  { name: "Dag Hammarskjöldsleden",           lat: 57.67799, lng: 11.94235, group: "gbg" }, // CP 441
  { name: "Dag Hammarskjöldsleden",           lat: 57.67806, lng: 11.94218, group: "gbg" }, // CP 442
  { name: "Margaretebergsgatan",              lat: 57.68084, lng: 11.94323, group: "gbg" }, // CP 451
  { name: "Margaretebergsgatan",              lat: 57.68083, lng: 11.94318, group: "gbg" }, // CP 452
  { name: "Fjällgatan/Jungmansgatan",         lat: 57.69613, lng: 11.94561, group: "gbg" }, // CP 461
  { name: "Fjällgatan/Jungmansgatan",         lat: 57.69614, lng: 11.94559, group: "gbg" }, // CP 462
  { name: "Stigbergsliden",                   lat: 57.69944, lng: 11.93682, group: "gbg" }, // CP 471
  { name: "Stigbergsliden",                   lat: 57.69952, lng: 11.93634, group: "gbg" }, // CP 472
  { name: "E45 Oscarsleden",                  lat: 57.69994, lng: 11.93589, group: "gbg" }, // CP 481
  { name: "E45 Oscarsleden",                  lat: 57.70001, lng: 11.93586, group: "gbg" }, // CP 481b
  { name: "E45 Oscarsleden",                  lat: 57.70006, lng: 11.93585, group: "gbg" }, // CP 482
  { name: "Emigrantvägen",                    lat: 57.70014, lng: 11.93581, group: "gbg" }, // CP 491
  { name: "Emigrantvägen",                    lat: 57.70014, lng: 11.93586, group: "gbg" }, // CP 492
  { name: "Älvsborgsbron",                    lat: 57.69494, lng: 11.89896, group: "gbg" }, // CP 501
  { name: "Älvsborgsbron",                    lat: 57.69498, lng: 11.89915, group: "gbg" }, // CP 502
  { name: "Lindholmsallén",                   lat: 57.70763, lng: 11.93581, group: "gbg" }, // CP 511
  { name: "Lindholmsallén",                   lat: 57.70781, lng: 11.93581, group: "gbg" }, // CP 512
  { name: "Karlavagnsgatan västra",           lat: 57.70820, lng: 11.93528, group: "gbg" }, // CP 521
  { name: "Karlavagnsgatan västra",           lat: 57.70824, lng: 11.93518, group: "gbg" }, // CP 522
  { name: "Polstjärnegatan",                  lat: 57.71056, lng: 11.93644, group: "gbg" }, // CP 531
  { name: "Polstjärnegatan",                  lat: 57.71057, lng: 11.93650, group: "gbg" }, // CP 532
  { name: "Polstjärnegatan",                  lat: 57.71139, lng: 11.93734, group: "gbg" }, // CP 533
  { name: "Polstjärnegatan",                  lat: 57.71138, lng: 11.93728, group: "gbg" }, // CP 534
  { name: "Karlavagnsgatan östra",            lat: 57.71192, lng: 11.94306, group: "gbg" }, // CP 541
  { name: "Karlavagnsgatan östra",            lat: 57.71191, lng: 11.94303, group: "gbg" }, // CP 542
  { name: "Hjalmar Brantingsgatan",           lat: 57.72024, lng: 11.95807, group: "gbg" }, // CP 551
  { name: "Hjalmar Brantingsgatan",           lat: 57.72030, lng: 11.95806, group: "gbg" }, // CP 551b
  { name: "Hjalmar Brantingsgatan",           lat: 57.72050, lng: 11.95953, group: "gbg" }, // CP 552
  { name: "Södra Tagenevägen",                lat: 57.75925, lng: 11.98865, group: "gbg" }, // CP 561
  { name: "Södra Tagenevägen",                lat: 57.75922, lng: 11.98863, group: "gbg" }, // CP 562
  { name: "Skälltorpsvägen",                  lat: 57.75824, lng: 11.98964, group: "gbg" }, // CP 571
  { name: "Skälltorpsvägen",                  lat: 57.75817, lng: 11.98967, group: "gbg" }, // CP 572
  { name: "Backadalen",                       lat: 57.74764, lng: 11.98894, group: "gbg" }, // CP 581
  { name: "Backadalen",                       lat: 57.74754, lng: 11.98891, group: "gbg" }, // CP 582
  { name: "Tingstadsmotet avfart E6",         lat: 57.73202, lng: 11.98332, group: "gbg" }, // CP 591
  { name: "Tingstadvägen",                    lat: 57.73095, lng: 11.98229, group: "gbg" }, // CP 601
  { name: "Tingstadvägen",                    lat: 57.73095, lng: 11.98227, group: "gbg" }, // CP 602
  { name: "Ringömotet",                       lat: 57.72581, lng: 11.97542, group: "gbg" }, // CP 611
  { name: "Ringömotet",                       lat: 57.72623, lng: 11.97699, group: "gbg" }, // CP 612
  { name: "Ringömotet",                       lat: 57.72451, lng: 11.98228, group: "gbg" }, // CP 613
  { name: "Ringömotet",                       lat: 57.72457, lng: 11.98238, group: "gbg" }, // CP 613b
  { name: "Ringömotet",                       lat: 57.72486, lng: 11.98306, group: "gbg" }, // CP 614
  { name: "Ringömotet",                       lat: 57.72481, lng: 11.98286, group: "gbg" }, // CP 614b
  { name: "Ringömotet",                       lat: 57.72475, lng: 11.98264, group: "gbg" }, // CP 614c
  { name: "Salsmästaregatan",                 lat: 57.72402, lng: 11.98463, group: "gbg" }, // CP 621
  { name: "Salsmästaregatan",                 lat: 57.72403, lng: 11.98466, group: "gbg" }, // CP 622
  { name: "Marieholmsgatan",                  lat: 57.72072, lng: 11.99075, group: "gbg" }, // CP 631
  { name: "Marieholmsgatan",                  lat: 57.72074, lng: 11.99078, group: "gbg" }, // CP 632
  { name: "E45 Marieholmsleden",              lat: 57.72012, lng: 11.99376, group: "gbg" }, // CP 641
  { name: "E45 Marieholmsleden",              lat: 57.72005, lng: 11.99393, group: "gbg" }, // CP 642
  { name: "E45 Marieholmsleden",              lat: 57.71997, lng: 11.99411, group: "gbg" }, // CP 644
  { name: "Partihandelsgatan",                lat: 57.71861, lng: 11.99454, group: "gbg" }, // CP 651
  { name: "Partihandelsgatan",                lat: 57.71862, lng: 11.99457, group: "gbg" }, // CP 652
  { name: "E20 Alingsåsleden",               lat: 57.71680, lng: 11.99688, group: "gbg" }, // CP 661
  { name: "E20 Alingsåsleden",               lat: 57.71684, lng: 11.99678, group: "gbg" }, // CP 661b
  { name: "E20 Alingsåsleden",               lat: 57.71673, lng: 11.99705, group: "gbg" }, // CP 662
  { name: "Olskroksmotet avfart E20",         lat: 57.71524, lng: 11.99505, group: "gbg" }, // CP 672
  { name: "Olskroksmotet påfart E6",          lat: 57.71479, lng: 11.99495, group: "gbg" }, // CP 681
  { name: "Redbergsvägen",                    lat: 57.71406, lng: 11.99458, group: "gbg" }, // CP 693
  { name: "Redbergsvägen",                    lat: 57.71399, lng: 11.99483, group: "gbg" }, // CP 694
  { name: "Redbergsvägen",                    lat: 57.71365, lng: 11.99502, group: "gbg" }, // CP 696
  { name: "Willinsbron",                      lat: 57.70930, lng: 11.99706, group: "gbg" }, // CP 701
  { name: "Willinsbron",                      lat: 57.70922, lng: 11.99706, group: "gbg" }, // CP 702
  { name: "Örgrytevägen",                     lat: 57.69788, lng: 11.99723, group: "gbg" }, // CP 711
  { name: "Örgrytevägen",                     lat: 57.69772, lng: 11.99731, group: "gbg" }, // CP 712
  { name: "Kungsbackaleden",                  lat: 57.68987, lng: 12.00068, group: "gbg" }, // CP 721
  { name: "Kungsbackaleden",                  lat: 57.68983, lng: 12.00066, group: "gbg" }, // CP 721b
  { name: "Kungsbackaleden",                  lat: 57.68901, lng: 12.00100, group: "gbg" }, // CP 722
  { name: "Kungsbackaleden",                  lat: 57.68905, lng: 12.00102, group: "gbg" }, // CP 722b
  { name: "Kungsbackaleden",                  lat: 57.68847, lng: 12.00123, group: "gbg" }, // CP 723
  { name: "Kungsbackaleden",                  lat: 57.68845, lng: 12.00104, group: "gbg" }, // CP 724
  { name: "Sankt Sigfridsgatan",              lat: 57.68919, lng: 12.00498, group: "gbg" }, // CP 731
  { name: "Sankt Sigfridsgatan",              lat: 57.68943, lng: 12.00489, group: "gbg" }, // CP 732
  { name: "Mölndalsvägen",                    lat: 57.68506, lng: 11.99954, group: "gbg" }, // CP 751
  { name: "Mölndalsvägen",                    lat: 57.68503, lng: 11.99929, group: "gbg" }, // CP 752
  { name: "Marieholmstunneln avfart E6 norr", lat: 57.72824, lng: 11.98670, group: "gbg" }, // CP 761
  { name: "Marieholmstunneln påfart E6 norr", lat: 57.72864, lng: 11.98699, group: "gbg" }, // CP 772
  { name: "Bäcktuvevägen",                    lat: 57.73887, lng: 11.94102, group: "gbg" }, // CP 915
  { name: "Bäcktuvevägen",                    lat: 57.73889, lng: 11.94101, group: "gbg" }, // CP 916
  { name: "Tuvevägen",                        lat: 57.73891, lng: 11.94152, group: "gbg" }, // CP 925
  { name: "Tuvevägen",                        lat: 57.73890, lng: 11.94129, group: "gbg" }, // CP 926
  { name: "Minelundsvägen",                   lat: 57.72972, lng: 11.95306, group: "gbg" }, // CP 935
  { name: "Minelundsvägen",                   lat: 57.72971, lng: 11.95302, group: "gbg" }, // CP 936
  { name: "Deltavägen",                       lat: 57.72847, lng: 11.95410, group: "gbg" }, // CP 945
  { name: "Deltavägen",                       lat: 57.72847, lng: 11.95411, group: "gbg" }, // CP 946
  { name: "Backavägen",                       lat: 57.72636, lng: 11.96028, group: "gbg" }, // CP 955
  { name: "Backavägen",                       lat: 57.72639, lng: 11.96009, group: "gbg" }, // CP 956
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

// ── Göteborg — taxa (ingen säsongsskillnad) ───────────────────────────────
// Källa: Transportstyrelsen (2024)
const GBG_TIME_SLOTS = [
  [600,  629,  9],
  [630,  659, 16],
  [700,  759, 22],
  [800,  829, 16],
  [830, 1459,  9],
  [1500, 1529, 16],
  [1530, 1659, 22],
  [1700, 1759, 16],
  [1800, 1829,  9],
];
const GBG_MAX_SEK = 60;

function ctGetGbgRate(date) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return 0;    // helg
  if (date.getMonth() === 6) return 0;     // juli

  const t = date.getHours() * 100 + date.getMinutes();
  for (const [start, end, rate] of GBG_TIME_SLOTS) {
    if (t >= start && t <= end) return rate;
  }
  return 0;
}

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
    this.passedStations      = new Set(); // förhindrar dubbeldebitering av samma sensor
    this.essingeledenCharged = false;     // max en avgift per Essingeleden-passage
    this.passages            = [];
    this.season              = null;
    // Göteborg: 60-minutersregeln — spårar pågående fönster
    this.gbgWindowStart      = null;      // ms-timestamp för fönstrets start
    this.gbgWindowRate       = 0;         // högsta debiterade taxa i fönstret
  }

  checkPoint(lat, lng, timestamp) {
    let newPassage = null;

    for (const station of TOLL_STATIONS) {
      // Använd station.name + position som unik sensor-nyckel
      const sensorKey = `${station.name}|${station.lat}|${station.lng}`;
      if (this.passedStations.has(sensorKey)) continue;
      if (ctHaversineM(lat, lng, station.lat, station.lng) > DETECTION_RADIUS_M) continue;

      this.passedStations.add(sensorKey);

      let sek  = 0;
      let note = null;

      if (station.group === "gbg") {
        // ── Göteborg: 60-minutersregeln ──────────────────────────────────
        const rate = ctGetGbgRate(timestamp);
        if (rate === 0) continue;

        const ms = timestamp.getTime();
        const inWindow = this.gbgWindowStart !== null &&
                         (ms - this.gbgWindowStart) <= 60 * 60 * 1000;

        if (inWindow) {
          if (rate > this.gbgWindowRate) {
            sek = rate - this.gbgWindowRate; // debitera skillnaden
            this.gbgWindowRate = rate;
          } else {
            note = "60-minutersregeln";
          }
        } else {
          // Nytt fönster
          sek = rate;
          this.gbgWindowStart = ms;
          this.gbgWindowRate  = rate;
        }

      } else {
        // ── Stockholm ─────────────────────────────────────────────────────
        const rate = ctGetRate(timestamp, station.group);
        if (rate === 0) continue;

        if (!this.season) this.season = getSeason(timestamp);

        if (station.group === "essingeleden") {
          if (this.essingeledenCharged) {
            note = "Ingår i Essingeleden-passage";
          } else {
            this.essingeledenCharged = true;
            sek = rate;
          }
        } else {
          sek = rate;
        }
      }

      const timeStr = timestamp.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
      const passage = { station: station.name, time: timeStr, sek, note };
      this.passages.push(passage);
      newPassage = passage;
    }

    return newPassage;
  }

  getTotal() {
    // Stockholm och Göteborg har separata dagsmaxima
    const sthlmMax = MAX_SEK[this.season || "offpeak"];
    const sthlm = this.passages
      .filter(p => !this._isGbg(p))
      .reduce((s, p) => s + p.sek, 0);
    const gbg = this.passages
      .filter(p => this._isGbg(p))
      .reduce((s, p) => s + p.sek, 0);

    return Math.min(sthlm, sthlmMax) + Math.min(gbg, GBG_MAX_SEK);
  }

  _isGbg(passage) {
    // Avgör om en passage tillhör Göteborg baserat på stationsnamn
    return TOLL_STATIONS.some(
      s => s.group === "gbg" && s.name === passage.station
    );
  }
}
