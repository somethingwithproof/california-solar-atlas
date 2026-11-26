> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Ilayisensi](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Umhloli ongaguqukiyo onokukhangelwa wemitha yelanga esasaziweyo exeliweyo kuzo zonke izixeko ezingama-483 ezibandakanyiweyo zaseCalifornia nakuzo zonke iikhawunti ezingama-58.

## Iimpawu

- Khangela sonke isixeko esibandakanyiweyo saseCalifornia kwaye uphonononge zonke iikhawunti ezingama-58.
- Jonga umthamo we-DC oxeliweyo, uluhlu lwemveliso yonyaka elungiswe ngokwendawo yemozulu nobudala, ukukhula kweminyaka emihlanu, amacandelo abathengi, kunye namanani eendawo ezinxulumene nokugcinwa kwamandla.
- Imephu ye-choropleth esebenzisanayo kwilizwe lonke esebenzisa ii-polygon zezixeko ezibandakanyiweyo ezisemthethweni.
- Uluhlu lwezixeko olunokuhlungwa ngokwabemi, ukugubungela kweenkonzo zombane, kunye nejografi yeposi, kunye nothelekiso lwezixeko ezine ecaleni kwesinye.
- Ii-URL zezixeko neekhawunti ezabelanayo, ukuthunyelwa kwe-CSV ne-SVG, kunye nemida yedatha ecacileyo.
- Iilwimi zasekuhlaleni zojongano ezingama-45 (ezingama-20 ze-Tier 1, ezili-15 zase-Afrika, nezili-10 zase-Asia) ezinokubonwa ngokuzenzekelayo kolwimi lwebhrawuza, umkhethi wolwimi kwisihloko esiphezulu, kunye nenkxaso yoyilo lwe-RTL.

## Ulungiselelo lweelwimi

Imitya yojongano ihlala kwi-`src/locales/` kwiilwimi zasekuhlaleni ezingama-45. Xa ilayisha, i-app ihlola i-`?lang=`, `localStorage`, kunye ne-`navigator.languages` / `navigator.language`, ibuyela kwisiNgesi xa ingafumaneki. Iilwimi zasekuhlaleni ze-RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) zibeka ngokuzenzekelayo u-`dir="rtl"`.

## Qalisa ekuhlaleni

```bash
npm ci
npm run dev
npm test
npm run build
```

Jonga i-[README yesiNgesi](../../../README.md) epheleleyo ukuze ufumane iinkcukacha zendlela yokusebenza, imibhobho yedatha, kunye nokukhutshwa kwe-Parquet. Inikwe ilayisensi phantsi kwe-[MIT](../../../LICENSE).
