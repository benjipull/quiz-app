const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { installScriptErrorPrefix } = require("./errorLogger");
installScriptErrorPrefix();
const connectDB = require("../config/db");
const Category = require("../models/categoryModel");
const {
  assertImageSetup,
  generateCategoryImageBase64,
} = require("../services/imageClient");
const { optimizeBase64Image } = require("../utils/optimizeBase64Image");
const { sleep } = require("../utils/asyncUtils");
const { toPreviewString } = require("../utils/logUtils");

const REQUEST_DELAY_MS = Number(process.env.IMAGE64_REQUEST_DELAY_MS || 300);
const ERROR_OUTPUT_PREVIEW_MAX_CHARS = Number(
  process.env.IMAGE64_ERROR_OUTPUT_PREVIEW_MAX_CHARS || 6000,
);
const OPTIMIZE_BEFORE_SAVE = String(
  process.env.IMAGE64_OPTIMIZE_BEFORE_SAVE || "true",
).toLowerCase() !== "false";
const INCLUDE_EXISTING_BY_DEFAULT = String(
  process.env.IMAGE64_INCLUDE_EXISTING || "false",
).toLowerCase() === "true";

function shouldIncludeExistingImagesFromArgs(argv) {
  return argv.includes("--all") || argv.includes("--force");
}

async function populateCategoryImage64(options = {}) {
  const includeExistingImages = Boolean(options.includeExistingImages);
  const query = includeExistingImages
    ? {}
    : {
        $or: [
          { image64: { $exists: false } },
          { image64: "" },
        ],
      };

  const categories = await Category.find(query)
    .select("_id name")
    .lean();

  if (!categories.length) {
    console.log(
      includeExistingImages
        ? "No categories found."
        : "No categories with empty image64 field found.",
    );
    return;
  }

  if (includeExistingImages) {
    console.log(
      `Found ${categories.length} categories. Regenerating image64 for all categories (--all mode).`,
    );
  } else {
    console.log(`Found ${categories.length} categories with empty image64.`);
  }

  let updated = 0;
  let failed = 0;

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const label = `${index + 1}/${categories.length} (${category.name})`;

    try {
      console.log(`Generating image for ${label}...`);
      const { base64 } = await generateCategoryImageBase64(category.name);
      let image64ToSave = base64;

      if (OPTIMIZE_BEFORE_SAVE) {
        try {
          const optimized = await optimizeBase64Image(base64);
          image64ToSave = optimized.dataUri;
          const optimizationVerb = optimized.wasOptimized ? "Reduced" : "Kept";
          console.log(
            `${optimizationVerb} ${label}: ${optimized.bytesOriginal}B -> ${optimized.bytesFinal}B (${optimized.reductionPercent}% reduction, ${optimized.mimeType})`,
          );
        } catch (optimizeError) {
          console.warn(
            `Image optimization skipped for ${label}: ${optimizeError.message}`,
          );
        }
      }

      await Category.updateOne(
        { _id: category._id },
        { $set: { image64: image64ToSave } },
      );

      updated += 1;
      console.log(`Saved image64 for ${label}.`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${label}: ${error.message}`);
      const apiOutputPreview = toPreviewString(
        error?.apiOutput,
        ERROR_OUTPUT_PREVIEW_MAX_CHARS,
      );
      if (apiOutputPreview) {
        console.error(`Image API output for ${label}:\n${apiOutputPreview}`);
      }
    }

    if (REQUEST_DELAY_MS > 0 && index + 1 < categories.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log("");
  console.log("Category image64 population complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

async function main() {
  try {
    const includeExistingImages =
      shouldIncludeExistingImagesFromArgs(process.argv.slice(2)) ||
      INCLUDE_EXISTING_BY_DEFAULT;
    assertImageSetup();
    await connectDB();
    await populateCategoryImage64({ includeExistingImages });
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  populateCategoryImage64,
};
