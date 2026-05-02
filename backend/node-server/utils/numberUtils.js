function parseFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntegerAtLeastOrThrow(value, minimum, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < minimum) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return num;
}

function parseNonNegativeIntOrThrow(value, fieldName) {
  return parseIntegerAtLeastOrThrow(value, 0, fieldName);
}

function parseMinOneIntOrThrow(value, fieldName) {
  return parseIntegerAtLeastOrThrow(value, 1, fieldName);
}

module.exports = {
  parseFiniteNumber,
  parseNonNegativeIntOrThrow,
  parseMinOneIntOrThrow,
};
