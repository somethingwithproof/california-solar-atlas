> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

カリフォルニア州の全 483 法人化都市および全 58 郡における分散型太陽光発電の報告データを検索・探索できる静的エクスプローラーです。

## 主な機能

- カリフォルニア州のすべての法人化都市の検索と全 58 郡の閲覧。
- 報告済みの直流（DC）容量、気候帯および導入年次で補正した年間発電量の範囲、5 年間の成長率、需要家セクター、蓄電池併設サイト数の表示。
- 公式の法人化都市ポリゴンを用いた州全体のインタラクティブな階級区分図（コロプレス図）。
- 人口、電力会社カバー範囲、郵送地域フィルターを備えた都市ランキングと、4 都市の並列比較。
- 共有可能な都市・郡 URL、CSV および SVG エクスポート、データの制約事項に関する透明な開示。
- 45 ロケール（Tier 1 が 20、アフリカ地域が 15、アジア地域が 10）のインターフェース対応、ブラウザ言語の自動検出、ヘッダーの言語セレクター、RTL レイアウトのサポート。

## ローカライズ

インターフェース文字列は 45 ロケール分が `src/locales/` に格納されています。読み込み時にアプリは `?lang=`、`localStorage`、`navigator.languages` / `navigator.language` を順に確認し、該当しない場合は英語にフォールバックします。RTL ロケール（`ar`、`ar-EG`、`ar-MA`、`fa`、`he`、`ur`）では自動的に `dir="rtl"` が設定されます。

## ローカル実行

```bash
npm ci
npm run dev
npm test
npm run build
```

算出手法、データパイプライン、Parquet リリースの詳細は[英語版 README](../../../README.md)を参照してください。ライセンスは [MIT](../../../LICENSE) です。
