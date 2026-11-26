> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

一個靜態、可搜尋的探索工具，涵蓋加州所有 483 個建制市鎮與全數 58 個郡已申報的分散式太陽能資料。

## 功能特色

- 搜尋每一個加州建制市鎮並瀏覽全數 58 個郡。
- 檢視已申報的直流電（DC）容量、依氣候區與裝置年份調整的年發電量範圍、五年成長率、用戶類別以及連結儲能設備的站點數量。
- 使用官方建制市鎮多邊形邊界的互動式全州分區統計圖（Choropleth Map）。
- 提供人口數、公用事業涵蓋範圍與郵寄地理區域篩選的城市排名，以及四個城市的並列比較。
- 可分享的城市與郡級 URL、CSV 與 SVG 匯出，以及透明揭露的資料限制說明。
- 支援 45 種介面語系（20 種 Tier 1 語系、15 種非洲語系與 10 種亞洲語系），具備瀏覽器語言自動偵測、頁首語言選擇器與 RTL 版面配置支援。

## 在地化

介面字串位於 `src/locales/` 中，涵蓋 45 種語系。載入時，應用程式會依序檢查 `?lang=`、`localStorage` 與 `navigator.languages` / `navigator.language`，若無符合項目則回退至英文。RTL 語系（`ar`、`ar-EG`、`ar-MA`、`fa`、`he`、`ur`）會自動設定 `dir="rtl"`。

## 本機執行

```bash
npm ci
npm run dev
npm test
npm run build
```

方法論、資料管線與 Parquet 發布詳細資訊請參閱完整的[英文 README](../../../README.md)。採用 [MIT](../../../LICENSE) 授權條款。
