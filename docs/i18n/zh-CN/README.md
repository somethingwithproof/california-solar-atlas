> [English](../../../README.md)

# 加利福尼亚太阳能图谱

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![许可证](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

一个静态、可搜索的数据浏览器，用于展示加利福尼亚州全部 483 个建制市和 58 个县已上报的分布式太阳能数据。

## 功能特性

- 搜索加利福尼亚州的每一个建制市，并浏览全部 58 个县的数据。
- 查看已上报的直流装机容量、经气候区和建成年份校准的年发电量区间、五年增长情况、用户类型以及关联储能的站点数量。
- 基于官方建制市多边形边界的交互式全州分级统计地图。
- 支持按人口、电力公司覆盖范围及邮寄地理区域筛选的城市排名，以及四个城市的并排对比。
- 可分享的城市和县级 URL、CSV 与 SVG 导出，以及透明的数据局限性说明。
- 提供 45 种界面语言环境（20 个 Tier 1、15 个非洲和 10 个亚洲语言环境），支持浏览器语言自动检测、顶部语言选择器以及 RTL 布局。

## 本地化

界面字符串位于 `src/locales/` 目录下，涵盖 45 个语言环境。应用加载时会依次检查 `?lang=`、`localStorage` 以及 `navigator.languages` / `navigator.language`，若无匹配则回退至英语。RTL 语言环境（`ar`、`ar-EG`、`ar-MA`、`fa`、`he`、`ur`）会自动设置 `dir="rtl"`。

## 本地运行

```bash
npm ci
npm run dev
npm test
npm run build
```

有关计算方法、数据流水线和 Parquet 发布详情，请参阅完整的[英文 README](../../../README.md)。基于 [MIT](../../../LICENSE) 协议开源。
