> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Um explorador estático e pesquisável de geração solar distribuída reportada em todas as 483 cidades incorporadas e nos 58 condados da Califórnia.

## Recursos

- Pesquise cada cidade incorporada da Califórnia e navegue por todos os 58 condados.
- Visualize a capacidade CC reportada, faixas de geração anual ajustadas por zona climática e ano de instalação, crescimento em cinco anos, setores de clientes e contagens de locais com armazenamento associado.
- Mapa coroplético estadual interativo usando polígonos oficiais de cidades incorporadas.
- Rankings de cidades com filtros de população, cobertura de concessionária e geografia postal, além de comparação lado a lado de quatro cidades.
- URLs compartilháveis de cidades e condados, exportações em CSV e SVG e limitações de dados transparentes.
- 45 locales de interface (20 Tier 1, 15 africanos e 10 asiáticos) com detecção automática do idioma do navegador, seletor de idioma no cabeçalho e suporte a layout RTL.

## Localização

As strings de interface ficam em `src/locales/` em 45 locales. Ao carregar, a aplicação verifica `?lang=`, `localStorage` e `navigator.languages` / `navigator.language`, usando o inglês como fallback. Locales RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) definem `dir="rtl"` automaticamente.

## Executar localmente

```bash
npm ci
npm run dev
npm test
npm run build
```

Consulte o [README em inglês](../../../README.md) completo para detalhes de metodologia, pipelines de dados e lançamentos em Parquet. Licenciado sob [MIT](../../../LICENSE).
