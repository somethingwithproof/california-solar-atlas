import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const window = new JSDOM('<main id="view"></main>').window;
globalThis.window = window;
const { setMarkup } = await import('../src/render.js');
const view = window.document.querySelector('#view');

test('rendering removes active content from source markup', () => {
  setMarkup(view, '<p onclick="invalid">Source</p><script>invalid</script><a href="javascript:invalid">Link</a>');
  assert.equal(view.querySelector('script'), null);
  assert.equal(view.querySelector('p').hasAttribute('onclick'), false);
  assert.equal(view.querySelector('a').hasAttribute('href'), false);
  assert.equal(view.textContent, 'SourceLink');
});

test('rendering preserves map geometry, glossary and accessible controls', () => {
  setMarkup(view, '<svg viewBox="0 0 520 650"><path d="M1 2L3 4Z" data-city-id="0600001" role="button" tabindex="0"/></svg><span class="term" aria-label="Definition">Capacity</span><button data-action="share">Share</button>');
  assert.equal(view.querySelector('svg').getAttribute('viewBox'), '0 0 520 650');
  assert.equal(view.querySelector('path').getAttribute('d'), 'M1 2L3 4Z');
  assert.equal(view.querySelector('path').getAttribute('data-city-id'), '0600001');
  assert.equal(view.querySelector('span').getAttribute('aria-label'), 'Definition');
  assert.equal(view.querySelector('button').getAttribute('data-action'), 'share');
});

test('rendering preserves the existing safe external link behavior', () => {
  setMarkup(view, '<a href="https://example.com" target="_blank" rel="noreferrer">Source</a>');
  assert.equal(view.querySelector('a').target, '_blank');
  assert.equal(view.querySelector('a').rel, 'noreferrer');
});
