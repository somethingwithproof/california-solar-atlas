> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Umhloli omi ndawonye noseshekayo wamandla elanga asabalalisiwe abikiwe kuwo wonke amadolobha ahlanganiswe ngokusemthethweni angu-483 ase-California kanye nezifunda ezingu-58 zonke.

## Izici

- Sesha lonke idolobha elihlanganiswe ngokusemthethweni lase-California futhi uphequlule zonke izifunda ezingu-58.
- Buka umthamo we-DC obikiwe, amabanga okukhiqiza konyaka alungiswe ngokwezindawo zesimo sezulu neminyaka yamasistimu, ukukhula kweminyaka emihlanu, imikhakha yamakhasimende, kanye nezibalo zezindawo ezixhunywe nesitoreji.
- Imephu ye-choropleth esebenzisanayo yesifundazwe sonke esebenzisa ama-polygon asemthethweni amadolobha ahlanganiswe ngokusemthethweni.
- Ukukleliswa kwamadolobha okunezihlungi zenani labantu, ukumbozwa kwezinsiza zikagesi, kanye nezindawo zeposi, kanye nokuqhathaniswa kwamadolobha amane eceleni komunye nomunye.
- Ama-URL amadolobha nezifunda okwabelwana ngawo, ukukhipha nge-CSV ne-SVG, kanye nemikhawulo yedatha esobala.
- Izilimi zendawo zesixhumi esibonakalayo ezingu-45 (ezingu-20 ze-Tier 1, ezingu-15 zase-Afrika, kanye nezingu-10 zase-Asia) ezinokutholwa kolimi lwesiphequluli okuzenzakalelayo, isikhethi solimi esihlokweni, kanye nokusekelwa kwesakhiwo se-RTL.

## Ukwenziwa ngokwendawo

Imisho yesixhumi esibonakalayo itholakala ku-`src/locales/` ezilimini zendawo ezingu-45. Uma ilayisha, uhlelo lokusebenza luhlola i-`?lang=`, i-`localStorage`, ne-`navigator.languages` / `navigator.language`, bese lubuyela esiNgisini uma kungatholakali. Izilimi zendawo ze-RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) zisetha ngokuzenzakalelayo u-`dir="rtl"`.

## Qalisa kukhompyutha yakho

```bash
npm ci
npm run dev
npm test
npm run build
```

Bheka [i-README yesiNgisi](../../../README.md) ephelele ngemininingwane yendlela yokusebenza, imigqa yedatha, kanye nokukhishwa kwe-Parquet. Inikezwe ilayisense ngaphansi kwe-[MIT](../../../LICENSE).
