> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licencia](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Un explorador estático y con capacidad de búsqueda de la energía solar distribuida reportada en las 483 ciudades incorporadas y los 58 condados de California.

## Características

- Busca cualquiera de las ciudades incorporadas de California y explora los 58 condados.
- Consulta la capacidad en CC reportada, los rangos de generación anual ajustados por zona climática y antigüedad, el crecimiento a cinco años, los sectores de clientes y los recuentos de sitios vinculados a almacenamiento.
- Mapa coroplético interactivo a nivel estatal basado en polígonos oficiales de ciudades incorporadas.
- Clasificaciones de ciudades con filtros de población, cobertura de empresas de servicios públicos y geografía postal, además de comparación paralela entre cuatro ciudades.
- URL compartibles de ciudades y condados, exportaciones en CSV y SVG, y limitaciones de datos transparentes.
- 45 configuraciones regionales de interfaz (20 de nivel 1, 15 africanas y 10 asiáticas) con detección automática del idioma del navegador, selector de idioma en el encabezado y compatibilidad con diseño RTL.

## Localización

Las cadenas de la interfaz se encuentran en `src/locales/` en 45 configuraciones regionales. Al cargarse, la aplicación comprueba `?lang=`, `localStorage` y `navigator.languages` / `navigator.language`, y utiliza el inglés como alternativa predeterminada. Las configuraciones regionales RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) establecen automáticamente `dir="rtl"`.

## Ejecución local

```bash
npm ci
npm run dev
npm test
npm run build
```

Consulta el [README completo en inglés](../../../README.md) para conocer la metodología, las canalizaciones de datos y los detalles de publicación en Parquet. Publicado bajo la licencia [MIT](../../../LICENSE).
