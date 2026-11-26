// SPDX-FileCopyrightText: 2026 Thomas Vincent <thomasvincent@gmail.com>
// SPDX-License-Identifier: MIT

import ar from './locales/ar.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import hi from './locales/hi.json' with { type: 'json' };
import id from './locales/id.json' with { type: 'json' };
import it from './locales/it.json' with { type: 'json' };
import ja from './locales/ja.json' with { type: 'json' };
import ko from './locales/ko.json' with { type: 'json' };
import nl from './locales/nl.json' with { type: 'json' };
import pl from './locales/pl.json' with { type: 'json' };
import ptBR from './locales/pt-BR.json' with { type: 'json' };
import ru from './locales/ru.json' with { type: 'json' };
import sv from './locales/sv.json' with { type: 'json' };
import tr from './locales/tr.json' with { type: 'json' };
import uk from './locales/uk.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };
import zhCN from './locales/zh-CN.json' with { type: 'json' };
import zhTW from './locales/zh-TW.json' with { type: 'json' };

export const SUPPORTED_LOCALES = [
  'en', 'de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'ru', 'uk',
  'ja', 'ko', 'zh-CN', 'zh-TW', 'ar', 'hi', 'pl', 'tr', 'sv', 'vi', 'id',
];

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
};

const CATALOGS = {
  en, de, es, fr, it, 'pt-BR': ptBR, nl, ru, uk,
  ja, ko, 'zh-CN': zhCN, 'zh-TW': zhTW, ar, hi, pl, tr, sv, vi, id,
};

const STORAGE_KEY = 'csa-lang';
let activeLocale = 'en';

export function isRtl(locale) {
  return resolveLocale(locale) === 'ar';
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
  if (lower === 'pt' || lower === 'pt-br') return 'pt-BR';

  const exact = SUPPORTED_LOCALES.find((loc) => loc.toLowerCase() === lower);
  if (exact) return exact;

  const base = lower.split('-')[0];
  if (base === 'zh') {
    return /hant|-tw|-hk|-mo/.test(lower) ? 'zh-TW' : 'zh-CN';
  }
  if (base === 'pt') return 'pt-BR';

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
