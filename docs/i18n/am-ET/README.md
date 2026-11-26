> [English](../../../README.md)

# የካሊፎርኒያ የፀሐይ ኃይል አትላስ

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![ፈቃድ](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

በሁሉም 483 የተካተቱ የካሊፎርኒያ ከተሞች እና በሁሉም 58 አውራጃዎች ውስጥ የተመዘገበውን የተሰራጨ የፀሐይ ኃይል መረጃ ለመፈለግ የሚያገለግል የማይንቀሳቀስ መፈለጊያ።

## ባህሪያት

- እያንዳንዱን የተካተተ የካሊፎርኒያ ከተማ ይፈልጉ እና ሁሉንም 58 አውራጃዎች ያስሱ።
- የተመዘገበ የDC አቅም፣ በአየር ንብረት ቀጠና እና በተከላ ዘመን የተስተካከሉ ዓመታዊ የማመንጫ ክልሎችን፣ የአምስት ዓመት እድገትን፣ የደንበኛ ዘርፎችን እና ከማከማቻ ጋር የተገናኙ ጣቢያዎችን ብዛት ይመልከቱ።
- ይፋዊ የተካተቱ ከተሞችን ፖሊጎኖች የሚጠቀም በይነተገናኝ የክልል አቀፍ ኮሮፕሌት ካርታ።
- የከተሞች ደረጃ አሰጣጥ ከሕዝብ ብዛት፣ ከአገልግሎት ሽፋን እና ከፖስታ አድራሻ ጂኦግራፊ ማጣሪያዎች ጋር፣ እንዲሁም የአራት ከተሞች ጎን ለጎን ንጽጽር።
- ሊጋሩ የሚችሉ የከተማ እና የአውራጃ የURL አድራሻዎች፣ የCSV እና SVG ወደ ውጭ መላኪያዎች እና ግልጽ የመረጃ ገደቦች።
- 45 የበይነገጽ አካባቢዎች (20 ደረጃ 1፣ 15 የአፍሪካ እና 10 የእስያ አካባቢዎች) ከራስ-ሰር የአሳሽ ቋንቋ መለየት፣ ከራስጌ የቋንቋ መራጭ እና ከRTL አቀማመጥ ድጋፍ ጋር።

## አካባቢያዊ ትርጉም

የበይነገጽ ጽሑፎች በ`src/locales/` ውስጥ በ45 አካባቢዎች ይገኛሉ። ሲጫን መተግበሪያው `?lang=`፣ `localStorage` እና `navigator.languages` / `navigator.language` የተባሉትን ይፈትሻል፣ ካልተገኘም ወደ እንግሊዝኛ ይመለሳል። የRTL አካባቢዎች (`ar`፣ `ar-EG`፣ `ar-MA`፣ `fa`፣ `he`፣ `ur`) በራስ-ሰር `dir="rtl"` ያዘጋጃሉ።

## በአካባቢያዊ ማሽን ላይ ያስኪዱ

```bash
npm ci
npm run dev
npm test
npm run build
```

ለአሰራር ዘዴ፣ ለመረጃ ቧንቧዎች እና ለParquet ልቀት ዝርዝሮች ሙሉውን [የእንግሊዝኛ README](../../../README.md) ይመልከቱ። በ[MIT](../../../LICENSE) ፈቃድ የተሰጠ።
