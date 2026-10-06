import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeXml, positiveWorksheetValue } from '../scripts/xml.mjs';

test('workbook XML text decodes each source entity once', () => {
  assert.equal(decodeXml('<si><t>PG&amp;E &lt;district&gt;</t></si>'), 'PG&E <district>');
  assert.equal(decodeXml('&amp;lt; &amp;amp;'), '&lt; &amp;');
  assert.equal(decodeXml('&#39;&quot;'), '\'"');
});

test('tag removal preserves malformed text and handles long unfinished tags', () => {
  assert.equal(decodeXml('<>text<si>value</si>'), '<>textvalue');
  const unfinished = '<'.repeat(100_000);
  assert.equal(decodeXml(unfinished), unfinished);
});

test('matched city worksheet values reject nonnumeric and nonfinite data', () => {
  assert.equal(positiveWorksheetValue('12500', 'population'), 12500);
  for (const value of ['', undefined, '0', '-1']) {
    assert.equal(positiveWorksheetValue(value, 'population'), null);
  }
  for (const value of ['N/A', 'Infinity', 'NaN']) {
    assert.throws(() => positiveWorksheetValue(value, 'population'), /numeric and finite/);
  }
});
