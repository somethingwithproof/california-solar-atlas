> [English](../../../README.md)

# Atlas-ka Tamarta Qoraxda ee California

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Shatiga](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Sahamiye joogto ah oo la baari karo oo loogu talagalay tamarta qoraxda ee la qaybiyo oo la soo sheegay guud ahaan dhammaan 483 magaalo oo diiwaangashan iyo dhammaan 58 gobol ee California.

## Astaamaha

- Ka raadi magaalo kasta oo diiwaangashan gudaha California oo baadh dhammaan 58-da gobol.
- Eeg awoodda DC ee la soo sheegay, qiyaasaha wax-soo-saarka sannadlaha ah ee lagu hagaajiyay aagga cimilada iyo da'da nidaamka, kobaca shanta sano, qaybaha macaamiisha, iyo tirada goobaha ku xiran kaydinta tamarta.
- Khariidad is-dhexgal ah oo gobolka oo dhan ah oo adeegsanaysa xuduudaha rasmiga ah ee magaalooyinka diiwaangashan.
- Kala-sarreynta magaalooyinka oo leh shaandhooyin ku saleysan tirada dadka, daboolista shirkadaha tamarta, iyo juqraafiga boostada, oo ay weheliso isbarbardhigga afar magaalo oo isku mar ah.
- Ciwaannada URL ee magaalooyinka iyo gobollada ee la wadaagi karo, dhoofinta CSV iyo SVG, iyo xaddidaadaha xogta oo hufan.
- 45 deegaan oo is-dhexgal ah (20 Heerka 1-aad, 15 Afrikaan, iyo 10 Aasiyaan ah) oo leh ogaanshaha tooska ah ee luqadda biraawsarka, xulashada luqadda ee madaxa sare, iyo taageerada qaabka RTL.

## Deegaameynta

Qoraallada is-dhexgalka waxay ku jiraan `src/locales/` guud ahaan 45 deegaan. Marka uu soo baxo, abka wuxuu hubiyaa `?lang=`, `localStorage`, iyo `navigator.languages` / `navigator.language`, isagoo ku noqonaya Ingiriis haddii la waayo. Deegaannada RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) waxay si toos ah u dejiyaan `dir="rtl"`.

## Ku socodsii maxalli ahaan

```bash
npm ci
npm run dev
npm test
npm run build
```

Eeg [README-ga Ingiriisiga](../../../README.md) oo dhammaystiran si aad u hesho hab-raaca, dhuumaha xogta, iyo faahfaahinta sii-deynta Parquet. Waxaa lagu shatiyeeyay [MIT](../../../LICENSE).
