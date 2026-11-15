// SPDX-FileCopyrightText: 2026 Thomas Vincent <thomasvincent@gmail.com>
// SPDX-License-Identifier: MIT

import DOMPurify from 'dompurify';

// All rendered data passes through the same HTML/SVG sanitizer.
export function setMarkup(element, markup) {
  element.innerHTML = DOMPurify.sanitize(markup, { ADD_ATTR: ['target'] });
}
