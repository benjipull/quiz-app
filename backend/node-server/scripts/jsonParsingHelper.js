function normalizeJsonText(raw, options = {}) {
  const {
    stripMarkdown = true,
    stripThinkTags = false,
    stripIntroPrefix = false,
    normalizeQuotes = true,
    repairInvalidSingleQuoteEscapes = true,
  } = options;

  let cleaned = String(raw ?? "").trim();

  if (stripMarkdown) {
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "");
  }

  if (stripThinkTags) {
    cleaned = cleaned
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^<think>[\s\S]*?(?=\{)/i, "")
      .replace(/<\/?think>/gi, "");
  }

  if (stripIntroPrefix) {
    cleaned = cleaned.replace(/^Here.*?:/i, "");
  }

  if (normalizeQuotes) {
    cleaned = cleaned
      .replace(/\u201C|\u201D/g, "\"")
      .replace(/\u2018|\u2019/g, "'");
  }

  if (repairInvalidSingleQuoteEscapes) {
    // Ollama sometimes emits JSON-like strings with invalid \' escapes.
    // JSON only allows escaping double quotes; normalize this to a plain apostrophe.
    cleaned = cleaned.replace(/\\'/g, "'");
  }

  return cleaned.trim();
}

function extractFirstJsonObject(text, fromIndex = 0) {
  const source = String(text ?? "");
  const start = source.indexOf("{", fromIndex);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          json: source.slice(start, index + 1),
          start,
        };
      }
    }
  }

  return null;
}

function parseJsonObject(raw, options = {}) {
  const { normalizeOptions = {} } = options;
  const cleaned = normalizeJsonText(raw, normalizeOptions);
  if (!cleaned) return null;

  const candidates = [cleaned];
  const repairedCleaned = normalizeJsonText(cleaned, {
    stripMarkdown: false,
    stripThinkTags: false,
    stripIntroPrefix: false,
    normalizeQuotes: false,
    repairInvalidSingleQuoteEscapes: true,
  });
  if (repairedCleaned !== cleaned) {
    candidates.push(repairedCleaned);
  }

  let searchFrom = 0;
  while (searchFrom < cleaned.length) {
    const extracted = extractFirstJsonObject(cleaned, searchFrom);
    if (!extracted) break;

    candidates.push(extracted.json);
    const repairedExtracted = normalizeJsonText(extracted.json, {
      stripMarkdown: false,
      stripThinkTags: false,
      stripIntroPrefix: false,
      normalizeQuotes: false,
      repairInvalidSingleQuoteEscapes: true,
    });
    if (repairedExtracted !== extracted.json) {
      candidates.push(repairedExtracted);
    }
    searchFrom = extracted.start + 1;
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function parseJsonObjectOrThrow(raw, options = {}) {
  const parsed = parseJsonObject(raw, options);
  if (parsed) return parsed;

  throw new Error("No JSON object found in model response");
}

module.exports = {
  normalizeJsonText,
  parseJsonObject,
  parseJsonObjectOrThrow,
};
