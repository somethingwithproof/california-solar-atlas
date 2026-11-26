> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licenza](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Un esploratore statico e ricercabile per il fotovoltaico distribuito dichiarato in tutte le 483 città incorporate della California e in tutte le 58 contee.

## Funzionalità

- Cerca ogni città incorporata della California e sfoglia tutte le 58 contee.
- Visualizza la capacità DC dichiarata, gli intervalli di generazione annuale adattati per zona climatica e anno di installazione, la crescita quinquennale, i settori di utenza e il conteggio dei siti dotati di accumulo.
- Mappa coropletica interattiva su scala statale basata sui poligoni ufficiali delle città incorporate.
- Classifiche delle città con filtri per popolazione, copertura dei gestori elettrici e area postale, oltre al confronto affiancato fino a quattro città.
- URL condivisibili per città e contee, esportazioni in CSV e SVG e limitazioni dei dati esposte in modo trasparente.
- 45 localizzazioni dell'interfaccia (20 Tier 1, 15 africane e 10 asiatiche) con rilevamento automatico della lingua del browser, selettore della lingua nell'intestazione e supporto per il layout RTL.

## Localizzazione

Le stringhe dell'interfaccia si trovano in `src/locales/` per 45 localizzazioni. Al caricamento, l'applicazione controlla `?lang=`, `localStorage` e `navigator.languages` / `navigator.language`, ripiegando sull'inglese in caso di assenza. Le localizzazioni RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) impostano automaticamente `dir="rtl"`.

## Esecuzione in locale

```bash
npm ci
npm run dev
npm test
npm run build
```

Consulta il [README completo in inglese](../../../README.md) per metodologia, pipeline dei dati e dettagli sui rilasci Parquet. Rilasciato sotto licenza [MIT](../../../LICENSE).
