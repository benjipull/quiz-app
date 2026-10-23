function stringifyCandidate(candidate) {
  if (candidate === undefined || candidate === null) return "";

  if (typeof candidate === "string") {
    return candidate.trim();
  }

  if (typeof candidate === "object") {
    return String(
      candidate.response ??
      candidate.text ??
      candidate.content ??
      candidate.message?.content ??
      JSON.stringify(candidate)
    ).trim();
  }

  return String(candidate).trim();
}

function firstNonEmpty(...candidates) {
  for (const candidate of candidates) {
    const text = stringifyCandidate(candidate);
    if (text) return text;
  }

  return "";
}

function getOutputItemText(item) {
  if (typeof item === "string") {
    return item.trim();
  }

  if (!item || typeof item !== "object") {
    return "";
  }

  return firstNonEmpty(
    item.response,
    item.text,
    item.message?.content,
    item.choices?.[0]?.text,
    item.choices?.[0]?.message?.content,
    item.thinking
  );
}

function getOllamaResponseText(response) {
  const data = response?.data || {};

  if (data.status === "FAILED" && data.error) {
    throw new Error(`RunPod execution failed: ${data.error}`);
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      const text = getOutputItemText(item);
      if (text) return text;
    }
  }

  return firstNonEmpty(
    data.response,
    data.text,
    data.message?.content,
    data.output?.response,
    data.output?.text,
    data.output?.message?.content,
    data.output?.choices?.[0]?.text,
    data.output?.choices?.[0]?.message?.content,
    data.thinking,
    data.output?.thinking
  );
}

module.exports = {
  getOllamaResponseText,
};
