> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

캘리포니아의 모든 483개 시(incorporated city)와 58개 카운티 전체에 걸쳐 보고된 분산형 태양광 발전 현황을 검색할 수 있는 정적 탐색기입니다.

## 주요 기능

- 캘리포니아의 모든 시를 검색하고 58개 카운티 전체를 탐색할 수 있습니다.
- 보고된 DC 용량, 기후대 및 설비 연식 보정 연간 발전량 범위, 5년간 성장률, 고객 부문 및 에너지 저장장치 연계 부지 수를 확인할 수 있습니다.
- 공식 시 행정구역 폴리곤을 사용한 주 전역 대화형 단계구분도(choropleth map)를 제공합니다.
- 인구, 전력회사 관할 범위 및 우편 지역 필터가 포함된 도시 순위와 4개 도시 나란히 비교 기능을 제공합니다.
- 공유 가능한 도시 및 카운티 URL, CSV 및 SVG 내보내기, 투명한 데이터 한계 안내를 제공합니다.
- 자동 브라우저 언어 감지, 헤더 언어 선택기 및 RTL 레이아웃을 지원하는 45개 인터페이스 로캘(Tier 1 20개, 아프리카 15개, 아시아 10개)을 제공합니다.

## 현지화

인터페이스 문자열은 `src/locales/` 아래 45개 로캘에 저장되어 있습니다. 앱이 로드될 때 `?lang=`, `localStorage`, `navigator.languages` / `navigator.language`를 순서대로 확인하며, 기본값은 영어입니다. RTL 로캘(`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`)은 자동으로 `dir="rtl"`을 설정합니다.

## 로컬 실행

```bash
npm ci
npm run dev
npm test
npm run build
```

방법론, 데이터 파이프라인 및 Parquet 릴리스 세부 정보는 전체 [영문 README](../../../README.md)를 참조하세요. [MIT](../../../LICENSE)에 따라 라이선스가 부여됩니다.
