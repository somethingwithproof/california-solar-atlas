> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lisans](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Kaliforniya'daki tüzel kişiliğe sahip 483 şehrin ve 58 ilçenin (county) tamamında bildirilen dağıtık güneş enerjisi verileri için statik, aranabilir bir keşif aracı.

## Özellikler

- Kaliforniya'daki tüzel kişiliğe sahip her şehri arayın ve 58 ilçenin tamamına göz atın.
- Bildirilen DC kapasitesini, iklim bölgesine ve kurulum yılına göre düzeltilmiş yıllık üretim aralıklarını, beş yıllık büyümeyi, müşteri sektörlerini ve depolama bağlantılı tesis sayılarını görüntüleyin.
- Resmi şehir sınırı poligonlarını kullanan etkileşimli eyalet geneli koroplet haritası.
- Nüfus, elektrik dağıtım şirketi kapsamı ve posta coğrafyası filtrelerine sahip şehir sıralamaları ile dört şehri yan yana karşılaştırma.
- Paylaşılabilir şehir ve ilçe URL'leri, CSV ve SVG dışa aktarımları ve şeffaf veri sınırlamaları.
- Otomatik tarayıcı dili algılama, üst bilgi dil seçicisi ve RTL düzen desteği ile 45 arayüz yerel ayarı (20 Tier 1, 15 Afrika ve 10 Asya yerel ayarı).

## Yerelleştirme

Arayüz metinleri 45 yerel ayar için `src/locales/` dizininde yer alır. Uygulama yüklendiğinde `?lang=`, `localStorage` ve `navigator.languages` / `navigator.language` değerlerini denetler, eşleşme olmazsa İngilizceye geri döner. RTL yerel ayarları (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) otomatik olarak `dir="rtl"` özniteliğini ayarlar.

## Yerel olarak çalıştırma

```bash
npm ci
npm run dev
npm test
npm run build
```

Yöntem, veri boru hatları ve Parquet sürüm ayrıntıları için tam [İngilizce README](../../../README.md) dosyasına bakın. [MIT](../../../LICENSE) altında lisanslanmıştır.
