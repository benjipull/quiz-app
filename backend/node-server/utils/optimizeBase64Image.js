const SUPPORTED_FORMATS = new Set(["webp", "jpeg", "png"]);

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFormat(value) {
  const normalized = String(value || "webp").toLowerCase();
  return SUPPORTED_FORMATS.has(normalized) ? normalized : "webp";
}

function parseBase64Input(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Image input must be a non-empty base64 string.");
  }

  const trimmed = input.trim();
  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (dataUriMatch) {
    return {
      mimeType: dataUriMatch[1].toLowerCase(),
      base64: dataUriMatch[2],
      hadDataUriPrefix: true,
    };
  }

  return {
    mimeType: "image/png",
    base64: trimmed,
    hadDataUriPrefix: false,
  };
}

function buildDataUri(mimeType, base64) {
  return `data:${mimeType};base64,${base64}`;
}

function getSharp() {
  try {
    return require("sharp");
  } catch (error) {
    throw new Error(
      "Image optimization requires the 'sharp' package. Run: npm install sharp",
    );
  }
}

async function optimizeBase64Image(base64Input, options = {}) {
  const sharp = getSharp();
  const parsed = parseBase64Input(base64Input);
  const inputBuffer = Buffer.from(parsed.base64, "base64");

  if (!inputBuffer.length) {
    throw new Error("Image input buffer is empty after base64 decode.");
  }

  const format = normalizeFormat(options.format || process.env.IMAGE64_OPTIMIZE_FORMAT || "webp");
  const quality = Math.max(
    1,
    Math.min(
      100,
      Math.round(parseNumber(options.quality, parseNumber(process.env.IMAGE64_OPTIMIZE_QUALITY, 68))),
    ),
  );
  const maxWidth = Math.max(
    0,
    Math.round(parseNumber(options.maxWidth, parseNumber(process.env.IMAGE64_OPTIMIZE_MAX_WIDTH, 192))),
  );

  let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();
  const metadata = await pipeline.metadata();
  if (maxWidth > 0 && Number(metadata?.width || 0) > maxWidth) {
    pipeline = pipeline.resize({
      width: maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort: 4 });
  } else if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true });
  }

  const optimizedBuffer = await pipeline.toBuffer();
  const bytesOriginal = inputBuffer.length;
  const bytesOptimized = optimizedBuffer.length;
  const useOptimized = bytesOptimized < bytesOriginal;

  const outputMimeType = useOptimized
    ? `image/${format === "jpeg" ? "jpeg" : format}`
    : parsed.mimeType;
  const outputBase64 = useOptimized
    ? optimizedBuffer.toString("base64")
    : parsed.base64;

  const bytesFinal = useOptimized ? bytesOptimized : bytesOriginal;
  const reductionPercent =
    bytesOriginal > 0
      ? Number((((bytesOriginal - bytesFinal) / bytesOriginal) * 100).toFixed(2))
      : 0;

  return {
    base64: outputBase64,
    dataUri: buildDataUri(outputMimeType, outputBase64),
    mimeType: outputMimeType,
    bytesOriginal,
    bytesFinal,
    reductionPercent,
    wasOptimized: useOptimized,
    hadDataUriPrefix: parsed.hadDataUriPrefix,
  };
}

module.exports = {
  optimizeBase64Image,
};
