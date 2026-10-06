import DOMPurify from 'dompurify';

// All rendered data passes through the same HTML/SVG sanitizer.
export function setMarkup(element, markup) {
  element.innerHTML = DOMPurify.sanitize(markup, { ADD_ATTR: ['target'] });
}
