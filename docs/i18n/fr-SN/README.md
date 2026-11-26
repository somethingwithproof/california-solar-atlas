> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Un explorateur statique et interrogeable des installations solaires décentralisées déclarées dans l'ensemble des 483 municipalités incorporées et des 58 comtés de Californie.

## Fonctionnalités

- Recherchez chaque municipalité incorporée de Californie et parcourez l'ensemble des 58 comtés.
- Consultez la puissance CC déclarée, les plages de production annuelle ajustées selon la zone climatique et l'année de mise en service, la croissance sur cinq ans, les secteurs de clientèle et le nombre de sites équipés de stockage.
- Carte choroplèthe interactive à l'échelle de l'État utilisant les polygones officiels des municipalités incorporées.
- Classements des villes avec filtres par population, couverture des services publics et géographie postale, ainsi qu'une comparaison côte à côte de quatre villes.
- URL partageables par ville et par comté, exports CSV et SVG, et présentation transparente des limites des données.
- 45 paramètres régionaux d'interface (20 de niveau 1, 15 africains et 10 asiatiques) avec détection automatique de la langue du navigateur, sélecteur de langue dans l'en-tête et prise en charge de l'affichage de droite à gauche (RTL).

## Localisation

Les chaînes d'interface se trouvent dans `src/locales/` pour 45 paramètres régionaux. Au chargement, l'application vérifie `?lang=`, `localStorage` et `navigator.languages` / `navigator.language`, avec repli sur l'anglais. Les paramètres régionaux RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) définissent automatiquement `dir="rtl"`.

## Exécution locale

```bash
npm ci
npm run dev
npm test
npm run build
```

Consultez le [README complet en anglais](../../../README.md) pour la méthodologie, les pipelines de données et les détails des publications Parquet. Sous licence [MIT](../../../LICENSE).
