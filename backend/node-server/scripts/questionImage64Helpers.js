function buildPendingImageConditions(imageVersion, pathPrefix = "questions.") {
  return [
    { [`${pathPrefix}image64`]: { $exists: false } },
    { [`${pathPrefix}image64`]: null },
    { [`${pathPrefix}image64`]: "" },
    { [`${pathPrefix}image_version`]: { $exists: false } },
    { [`${pathPrefix}image_version`]: null },
    { [`${pathPrefix}image_version`]: { $lt: imageVersion } },
  ];
}

function buildEligibleQuestionWriteMatch(
  questionId,
  includeExistingImages,
  imageVersion,
) {
  const questionMatch = {
    _id: questionId,
    disabled: { $ne: true },
    "image_eligibility.should_use_image": true,
  };

  if (!includeExistingImages) {
    questionMatch.$or = buildPendingImageConditions(imageVersion, "");
  }

  return questionMatch;
}

module.exports = {
  buildPendingImageConditions,
  buildEligibleQuestionWriteMatch,
};
