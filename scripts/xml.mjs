function stripXmlTags(value) {
  let result = '';
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf('<', cursor);
    if (start < 0) return result + value.slice(cursor);
    const end = value.indexOf('>', start + 1);
    if (end < 0) return result + value.slice(cursor);
    if (end === start + 1) {
      result += value.slice(cursor, end + 1);
      cursor = end + 1;
      continue;
    }
    result += value.slice(cursor, start);
    cursor = end + 1;
  }
  return result;
}

export function decodeXml(value = '') {
  const entities = { amp: '&', lt: '<', gt: '>', '#39': "'", quot: '"' };
  return stripXmlTags(value).replace(/&(amp|lt|gt|#39|quot);/g, (_, name) => entities[name]);
}

export function positiveWorksheetValue(raw, context) {
  if (raw == null || String(raw).trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${context}: worksheet value must be numeric and finite`);
  return value > 0 ? value : null;
}
