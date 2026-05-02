function toPreviewString(value, maxChars = 6000) {
  if (value == null) return "";

  let rendered = "";
  if (typeof value === "string") {
    rendered = value;
  } else {
    try {
      rendered = JSON.stringify(value, null, 2);
    } catch (error) {
      rendered = String(value);
    }
  }

  if (rendered.length <= maxChars) {
    return rendered;
  }

  return `${rendered.slice(0, maxChars)}\n... [truncated ${rendered.length - maxChars} chars]`;
}

module.exports = {
  toPreviewString,
};
