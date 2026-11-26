// SPDX-FileCopyrightText: 2026 Thomas Vincent <thomasvincent@gmail.com>
// SPDX-License-Identifier: MIT

import afZA from './locales/af-ZA.json' with { type: 'json' };
import amET from './locales/am-ET.json' with { type: 'json' };
import ar from './locales/ar.json' with { type: 'json' };
import arEG from './locales/ar-EG.json' with { type: 'json' };
import arMA from './locales/ar-MA.json' with { type: 'json' };
import bn from './locales/bn.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import fa from './locales/fa.json' with { type: 'json' };
import fil from './locales/fil.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import frMA from './locales/fr-MA.json' with { type: 'json' };
import frSN from './locales/fr-SN.json' with { type: 'json' };
import haNG from './locales/ha-NG.json' with { type: 'json' };
import he from './locales/he.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };
import id from './locales/id.json' with { type: 'json' };
import igNG from './locales/ig-NG.json' with { type: 'json' };
import it from './locales/it.json' with { type: 'json' };
import ja from './locales/ja.json' with { type: 'json' };
import ko from './locales/ko.json' with { type: 'json' };
import mgMG from './locales/mg-MG.json' with { type: 'json' };
import mr from './locales/mr.json' with { type: 'json' };
import ms from './locales/ms.json' with { type: 'json' };
import nl from './locales/nl.json' with { type: 'json' };
import pl from './locales/pl.json' with { type: 'json' };
import ptBR from './locales/pt-BR.json' with { type: 'json' };
import ru from './locales/ru.json' with { type: 'json' };
import rwRW from './locales/rw-RW.json' with { type: 'json' };
import soSO from './locales/so-SO.json' with { type: 'json' };
import sv from './locales/sv.json' with { type: 'json' };
import swKE from './locales/sw-KE.json' with { type: 'json' };
import ta from './locales/ta.json' with { type: 'json' };
import te from './locales/te.json' with { type: 'json' };
import th from './locales/th.json' with { type: 'json' };
import tr from './locales/tr.json' with { type: 'json' };
import uk from './locales/uk.json' with { type: 'json' };
import ur from './locales/ur.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };
import xhZA from './locales/xh-ZA.json' with { type: 'json' };
import yoNG from './locales/yo-NG.json' with { type: 'json' };
import zhCN from './locales/zh-CN.json' with { type: 'json' };
import zhTW from './locales/zh-TW.json' with { type: 'json' };
import zuZA from './locales/zu-ZA.json' with { type: 'json' };

export const SUPPORTED_LOCALES = [
  'en', 'de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'ru', 'uk',
  'ja', 'ko', 'zh-CN', 'zh-TW', 'ar', 'hi', 'pl', 'tr', 'sv', 'vi', 'id',
  'af-ZA', 'am-ET', 'ar-EG', 'ar-MA', 'fr-MA', 'fr-SN', 'ha-NG', 'ig-NG',
  'mg-MG', 'rw-RW', 'so-SO', 'sw-KE', 'xh-ZA', 'yo-NG', 'zu-ZA',
  'bn', 'fa', 'he', 'mr', 'ta', 'te', 'th', 'ur', 'ms', 'fil',
];

export const RTL_LOCALES = new Set(['ar', 'ar-EG', 'ar-MA', 'fa', 'he', 'ur']);

export const LOCALE_NAMES = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  'pt-BR': 'Português (Brasil)',
  nl: 'Nederlands',
  ru: 'Русский',
  uk: 'Українська',
  ja: '日本語',
  ko: '한국어',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ar: 'العربية',
  hi: 'हिन्दी',
  pl: 'Polski',
  tr: 'Türkçe',
  sv: 'Svenska',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  'af-ZA': 'Afrikaans (Suid-Afrika)',
  'am-ET': 'አማርኛ (ኢትዮጵያ)',
  'ar-EG': 'العربية (مصر)',
  'ar-MA': 'العربية (المغرب)',
  'fr-MA': 'Français (Maroc)',
  'fr-SN': 'Français (Sénégal)',
  'ha-NG': 'Hausa (Najeriya)',
  'ig-NG': 'Igbo (Naịjịrịa)',
  'mg-MG': 'Malagasy (Madagasikara)',
  'rw-RW': 'Kinyarwanda (U Rwanda)',
  'so-SO': 'Soomaali (Soomaaliya)',
  'sw-KE': 'Kiswahili (Kenya)',
  'xh-ZA': 'isiXhosa (uMzantsi Afrika)',
  'yo-NG': 'Yorùbá (Nàìjíríà)',
  'zu-ZA': 'isiZulu (iNingizimu Afrika)',
  bn: 'বাংলা',
  fa: 'فارسی',
  he: 'עברית',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  th: 'ไทย',
  ur: 'اردو',
  ms: 'Bahasa Melayu',
  fil: 'Filipino',
};

const CATALOGS = {
  en, de, es, fr, it, 'pt-BR': ptBR, nl, ru, uk,
  ja, ko, 'zh-CN': zhCN, 'zh-TW': zhTW, ar, hi, pl, tr, sv, vi, id,
  'af-ZA': afZA, 'am-ET': amET, 'ar-EG': arEG, 'ar-MA': arMA,
  'fr-MA': frMA, 'fr-SN': frSN, 'ha-NG': haNG, 'ig-NG': igNG,
  'mg-MG': mgMG, 'rw-RW': rwRW, 'so-SO': soSO, 'sw-KE': swKE,
  'xh-ZA': xhZA, 'yo-NG': yoNG, 'zu-ZA': zuZA,
  bn, fa, he, mr, ta, te, th, ur, ms, fil,
};

const BASE_ALIASES = {
  af: 'af-ZA',
  am: 'am-ET',
  ha: 'ha-NG',
  ig: 'ig-NG',
  in: 'id',
  iw: 'he',
  mg: 'mg-MG',
  pt: 'pt-BR',
  rw: 'rw-RW',
  so: 'so-SO',
  sw: 'sw-KE',
  tl: 'fil',
  xh: 'xh-ZA',
  yo: 'yo-NG',
  zu: 'zu-ZA',
};

const STORAGE_KEY = 'csa-lang';
let activeLocale = 'en';

export function isRtl(locale) {
  return RTL_LOCALES.has(resolveLocale(locale));
}

export function resolveLocale(tag) {
  if (!tag || typeof tag !== 'string') return 'en';
  const clean = tag.trim().split(/[.@]/)[0].replaceAll('_', '-');
  const lower = clean.toLowerCase();
  if (!lower || lower === 'c' || lower === 'posix') return 'en';

  if (['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant', 'zh-hant-tw', 'zh-hant-hk', 'zh-hant-mo'].includes(lower)) {
    return 'zh-TW';
  }
  if (['zh', 'zh-cn', 'zh-sg', 'zh-hans', 'zh-hans-cn', 'zh-hans-sg'].includes(lower)) {
    return 'zh-CN';
  }

  const exact = SUPPORTED_LOCALES.find((loc) => loc.toLowerCase() === lower);
  if (exact) return exact;

  const base = lower.split('-')[0];
  if (base === 'zh') {
    if (lower.includes('-hans')) return 'zh-CN';
    return /-hant|-tw|-hk|-mo/.test(lower) ? 'zh-TW' : 'zh-CN';
  }
  if (Object.hasOwn(BASE_ALIASES, base)) return BASE_ALIASES[base];

  return SUPPORTED_LOCALES.find((loc) => loc.toLowerCase() === base) || 'en';
}

export function detectLocale(options = {}) {
  const { search = globalThis.location?.search, navigatorObj = globalThis.navigator } = options;
  try {
    if (search) {
      const param = new URLSearchParams(search).get('lang');
      if (param) return resolveLocale(param);
    }
  } catch { /* ignore invalid search string */ }

  try {
    const storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage;
    const saved = storage?.getItem?.(STORAGE_KEY);
    if (saved) return resolveLocale(saved);
  } catch { /* storage may be unavailable */ }

  const candidates = [];
  if (Array.isArray(navigatorObj?.languages)) candidates.push(...navigatorObj.languages);
  if (navigatorObj?.language) candidates.push(navigatorObj.language);
  for (const candidate of candidates) {
    const clean = String(candidate || '').trim().toLowerCase();
    if (!clean) continue;
    const resolved = resolveLocale(clean);
    if (resolved !== 'en' || clean === 'en' || clean.startsWith('en-')) return resolved;
  }
  return 'en';
}

export function getCatalog(locale = activeLocale) {
  return CATALOGS[resolveLocale(locale)] || CATALOGS.en;
}

export function getLocale() {
  return activeLocale;
}

export function setLocale(locale, { persist = true, doc = globalThis.document } = {}) {
  activeLocale = resolveLocale(locale);
  if (persist) {
    try {
      globalThis.localStorage?.setItem?.(STORAGE_KEY, activeLocale);
    } catch { /* storage may be blocked */ }
  }
  if (doc?.documentElement) {
    doc.documentElement.lang = activeLocale;
    doc.documentElement.dir = isRtl(activeLocale) ? 'rtl' : 'ltr';
    doc.title = t('app.title');
    const skip = doc.querySelector('.skip-link');
    if (skip) skip.textContent = t('app.skip_to_content');
  }
  return activeLocale;
}

export function t(key, params = null, locale = activeLocale) {
  const catalog = getCatalog(locale);
  const template = Object.hasOwn(catalog, key)
    ? catalog[key]
    : (Object.hasOwn(CATALOGS.en, key) ? CATALOGS.en[key] : key);
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => (
    Object.hasOwn(params, name) ? String(params[name]) : match
  ));
}
