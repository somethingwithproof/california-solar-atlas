// SPDX-FileCopyrightText: 2026 Thomas Vincent <thomasvincent@gmail.com>
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import {
  detectLocale,
  getCatalog,
  getLocale,
  isRtl,
  LOCALE_NAMES,
  resolveLocale,
  setLocale,
  SUPPORTED_LOCALES,
  t,
} from '../src/i18n.js';

const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;
const placeholders = (str) => [...str.matchAll(PLACEHOLDER_RE)].map((m) => m[0]).sort();

test('all 45 locales load with 100% key and placeholder parity', () => {
  assert.equal(SUPPORTED_LOCALES.length, 45);
  const en = getCatalog('en');
  const enKeys = Object.keys(en).sort();
  assert.ok(enKeys.length > 0);

  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(LOCALE_NAMES[locale], `missing display name for ${locale}`);
    const catalog = getCatalog(locale);
    assert.deepEqual(Object.keys(catalog).sort(), enKeys, `key mismatch for ${locale}`);
    for (const key of enKeys) {
      assert.ok(catalog[key].trim().length > 0, `empty translation for ${locale}.${key}`);
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(en[key]),
        `placeholder mismatch for ${locale}.${key}`,
      );
    }
  }
});

test('locale resolution and navigator.language detection', () => {
  assert.equal(resolveLocale(''), 'en');
  assert.equal(resolveLocale('pt-BR'), 'pt-BR');
  assert.equal(resolveLocale('pt_PT'), 'pt-BR');
  assert.equal(resolveLocale('zh-CN'), 'zh-CN');
  assert.equal(resolveLocale('zh-Hans'), 'zh-CN');
  assert.equal(resolveLocale('zh-TW'), 'zh-TW');
  assert.equal(resolveLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(resolveLocale('ar-SA'), 'ar');
  assert.equal(resolveLocale('ar-EG'), 'ar-EG');
  assert.equal(resolveLocale('ar-MA'), 'ar-MA');
  assert.equal(resolveLocale('fr-MA'), 'fr-MA');
  assert.equal(resolveLocale('fr-SN'), 'fr-SN');
  assert.equal(resolveLocale('sw'), 'sw-KE');
  assert.equal(resolveLocale('yo'), 'yo-NG');
  assert.equal(resolveLocale('fa-IR'), 'fa');
  assert.equal(resolveLocale('iw-IL'), 'he');
  assert.equal(resolveLocale('ur-PK'), 'ur');
  assert.equal(resolveLocale('tl-PH'), 'fil');
  assert.equal(resolveLocale('hi-IN'), 'hi');
  assert.equal(resolveLocale('xx-YY'), 'en');

  assert.equal(detectLocale({ search: '', storage: null, navigatorObj: { languages: ['ja-JP', 'en-US'], language: 'ja-JP' } }), 'ja');
  assert.equal(detectLocale({ search: '?lang=de', storage: null, navigatorObj: { language: 'fr-FR' } }), 'de');
  assert.equal(detectLocale({ search: '', storage: { getItem: () => 'pt-BR' }, navigatorObj: { language: 'es-MX' } }), 'pt-BR');
});

test('RTL direction and document attributes apply for all 6 RTL locales and reset for LTR', () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><head><title>California Solar Atlas</title></head><body><a class="skip-link">Skip to content</a></body></html>');
  const rtlLocales = new Set(['ar', 'ar-EG', 'ar-MA', 'fa', 'he', 'ur']);
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(isRtl(locale), rtlLocales.has(locale));
  }

  for (const rtl of rtlLocales) {
    setLocale(rtl, { persist: false, doc: dom.window.document });
    assert.equal(getLocale(), rtl);
    assert.equal(dom.window.document.documentElement.lang, rtl);
    assert.equal(dom.window.document.documentElement.dir, 'rtl');
  }

  setLocale('en', { persist: false, doc: dom.window.document });
  assert.equal(dom.window.document.documentElement.lang, 'en');
  assert.equal(dom.window.document.documentElement.dir, 'ltr');
  assert.equal(t('app.title'), 'California Solar Atlas');
  assert.equal(t('hero.meta_cities', { count: '483' }), '483 incorporated cities');
});
