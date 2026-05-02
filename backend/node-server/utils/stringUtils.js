function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

module.exports = {
  escapeRegExp,
  normalizeWhitespace,
  normalizeText,
};
