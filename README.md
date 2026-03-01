# Körjournal

Personlig GPS-körjournal som Progressive Web App (PWA). Spårar körningar, beräknar milersättning och trängselskatt, och genererar månadsrapporter för skatteunderlag.

---

## Funktioner

### Körning
- **GPS-spårning** via `navigator.geolocation.watchPosition` med hög precision
- **Realtidsstatistik** — sträcka (km), tid (mm:ss) och trängselskatt uppdateras löpande
- **Wake lock** — håller skärmen aktiv under körning
- **Varning** om appen hamnar i bakgrunden och GPS-data kan saknas

### Restyp
- **Privat / Tjänst**-toggle väljs före varje körning
- **Schema** — definierar arbetstider per veckodag; appen väljer typ automatiskt baserat på klockslag och dag

### Trängselskatt
- Automatisk detektering av alla Stockholms betalstationer (Essingeleden, Centrala staden, Lidingövägen m.fl.)
- Korrekt taxa per station och tidpunkt enligt Skatteverkets regler
- Summeras per resa och visas i realtid

### Adresser
- **Automatisk reverse geocodning** av start- och stoppposition via OpenStreetMap Nominatim
- Visas i sammanfattningen direkt efter avslutad körning och i historiken

### Historik
- Fullständig reselista med datum, tid, sträcka, typ, adresser och belopp
- **Ruttvisning** på karta för sparade resor
- **Urvalslåge** med snabbval (Alla / per månad) för bulkoperationer

### Månadsrapport
- Summering per restyp (Tjänst / Privat): km, milersättning, trängselskatt, delsumma
- Välj valfri månad från dropdown
- Exportera vald månad som CSV

### Export & delning
- CSV-export med kolumner: Datum, Starttid, Sluttid, Typ, Startadress, Slutadress, Kilometer, Milersättning, Trängselskatt, Totalt, Anteckning
- Dela enskild resa via Web Share API (eller kopiera till urklipp som fallback)
- Export av markerade resor

### Inställningar
- Milersättning (kr/km) — standard 2,50 kr/km (Skatteverkets schablon)
- Startzoom för kartan
- Kartorientering: nord upp eller kurs upp (GPS-heading)
- Arbetstider: välj dagar och tidsintervall för automatisk restyp

### PWA / Offline
- Installerbar på hem-skärmen (Android och iOS)
- Fungerar offline — alla app-filer cachas via Service Worker
- Automatisk uppdatering vid ny version

---

## Teknisk stack

| Komponent | Teknik |
|-----------|--------|
| UI | Vanilla HTML/CSS/JS — ingen byggprocess |
| Karta | Leaflet 1.9.4 via CDN |
| GPS | `navigator.geolocation.watchPosition` |
| Lagring | `localStorage` (`korjournal_trips`, `korjournal_settings`) |
| Geocodning | OpenStreetMap Nominatim (gratis, ingen API-nyckel) |
| PWA | Service Worker (network-first), Web App Manifest |

---

## Filer

| Fil | Syfte |
|-----|-------|
| `index.html` | Allt UI — karta, panel, historik, modaler, CSS |
| `app.js` | All applogik |
| `congestion_tax.js` | Trängselskattlogik och stationsdata |
| `sw.js` | Service Worker (cache-first för app-filer) |
| `manifest.json` | PWA-manifest |
| `icon.svg` | App-ikon |
| `icon-192.png` | PWA-ikon 192×192 (krävs för Play Store) |
| `icon-512.png` | PWA-ikon 512×512 (krävs för Play Store) |
| `icon-512-maskable.png` | Maskable-ikon 512×512 för Android adaptiva ikoner |

---

## Play Store (TWA)

Appen kan publiceras på Google Play via **Trusted Web Activity (TWA)** med verktyget [PWABuilder](https://www.pwabuilder.com).

### Krav innan publicering

1. **PNG-ikoner** — skapa `icon-192.png`, `icon-512.png` och `icon-512-maskable.png` från `icon.svg`
2. **Egen domän** — appen måste hostas på HTTPS med en stabil URL
3. **`assetlinks.json`** — lägg filen på `https://din-domän.se/.well-known/assetlinks.json` med Android-appens SHA256-fingeravtryck (genereras av PWABuilder)

### Flöde
```
1. Hosta appen på HTTPS-domän
2. Kör PWABuilder med din URL → ladda ner Android-paketet (.aab)
3. Lägg ut assetlinks.json på domänen
4. Skapa Google Play-konto (engångsavgift ~25 USD)
5. Ladda upp .aab i Play Console
```

---

## Datamodell

```js
// Resa
{
  id:           Number,   // Date.now()
  startTime:    String,   // ISO 8601
  endTime:      String,
  points:       [{ lat, lng, ts }],
  distanceKm:   Number,
  passages:     [{ time, station, sek, note }],
  totalToll:    Number,
  note:         String,
  type:         "tjänst" | "privat",
  startAddress: String | null,
  endAddress:   String | null,
}

// Inställningar
{
  mileageRate:    Number,
  mapZoom:        Number,
  mapOrientation: "north" | "heading",
  schedule: {
    businessDays: Number[],  // 0=Sön ... 6=Lör
    startTime:    String,    // "HH:MM"
    endTime:      String,
  }
}
```
