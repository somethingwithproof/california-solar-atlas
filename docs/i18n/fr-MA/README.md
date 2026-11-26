> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Un explorateur statique avec recherche pour les installations solaires décentralisées déclarées dans l'ensemble des 483 municipalités incorporées et des 58 comtés de Californie.

## Fonctionnalités

- Recherche de chaque municipalité incorporée de Californie et navigation dans les 58 comtés.
- Consultation de la capacité DC déclarée, des plages de production annuelle ajustées selon la zone climatique et l'année d'installation, de la croissance sur cinq ans, des secteurs de clientèle et du nombre de sites équipés de stockage.
- Carte choroplèthe interactive à l'échelle de l'État utilisant les polygones officiels des municipalités incorporées.
- Classements des municipalités avec filtres par population, couverture par fournisseur d'électricité et zone postale, ainsi qu'une comparaison côte à côte de quatre municipalités.
- URL de municipalités et de comtés partageables, exports CSV et SVG, et présentation transparente des limites des données.
- 45 locales d'interface (20 de niveau 1, 15 africaines et 10 asiatiques) avec détection automatique de la langue du navigateur, sélecteur de langue dans l'en-tête et prise en charge de la mise en page RTL.

## Localisation

Les chaînes de l'interface se trouvent dans `src/locales/` pour les 45 locales. Au chargement, l'application vérifie `?lang=`, `localStorage` et `navigator.languages` / `navigator.language`, avec repli sur l'anglais. Les locales RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) appliquent automatiquement `dir="rtl"`.

## Exécution en local

```bash
npm ci
npm run dev
npm test
npm run build
```

Consultez le [README en anglais](../../../README.md) complet pour la méthodologie, les pipelines de données et les détails de publication au format Parquet. Sous licence [MIT](../../../LICENSE).
