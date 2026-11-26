> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lizenz](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Ein statischer, durchsuchbarer Explorer für gemeldete dezentrale Solaranlagen in allen 483 selbstverwalteten Städten (Incorporated Cities) und allen 58 Countys Kaliforniens.

## Funktionen

- Suche nach jeder selbstverwalteten Stadt in Kalifornien und Durchsuchen aller 58 Countys.
- Anzeige der gemeldeten DC-Leistung, nach Klimazone und Baujahr bereinigten jährlichen Erzeugungsspannen, des Fünfjahreswachstums, der Kundensektoren sowie der Anzahl der Standorte mit Speicheranbindung.
- Interaktive landesweite Choroplethenkarte auf Basis offizieller Stadtgebiets-Polygone.
- Städte-Rankings mit Filtern für Einwohnerzahl, Versorgungsgebiet und Postanschrift-Geografie sowie ein direkter Vergleich von vier Städten nebeneinander.
- Teilbare Stadt- und County-URLs, CSV- und SVG-Exporte sowie transparente Hinweise zu Dateneinschränkungen.
- 45 Oberflächen-Locales (20 Tier-1-, 15 afrikanische und 10 asiatische Locales) mit automatischer Browsersprachen-Erkennung, Sprachauswahl in der Kopfzeile und Unterstützung für RTL-Layouts.

## Lokalisierung

Die Texte der Benutzeroberfläche liegen für 45 Locales unter `src/locales/`. Beim Laden prüft die Anwendung `?lang=`, `localStorage` sowie `navigator.languages` / `navigator.language` und greift andernfalls auf Englisch zurück. RTL-Locales (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) setzen automatisch `dir="rtl"`.

## Lokal ausführen

```bash
npm ci
npm run dev
npm test
npm run build
```

Details zu Methodik, Datenpipelines und Parquet-Releases finden sich in der vollständigen [englischen README](../../../README.md). Lizenziert unter [MIT](../../../LICENSE).
