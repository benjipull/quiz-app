const buildStandardQuestionPrompt = require("./standardQuestion");
const buildCompletePhrasePrompt = require("./completePhrase");

const promptBuilders = [
  buildStandardQuestionPrompt,
  buildCompletePhrasePrompt,
];

for (const promptBuilder of promptBuilders) {
  if (typeof promptBuilder !== "function") {
    throw new TypeError("Question generation prompt modules must export functions.");
  }
}

function getRandomPromptBuilder() {
  const randomIndex = Math.floor(Math.random() * promptBuilders.length);
  return promptBuilders[randomIndex];
}

module.exports = {
  buildStandardQuestionPrompt,
  buildCompletePhrasePrompt,
  getRandomPromptBuilder,
};
