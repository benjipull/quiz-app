function buildPopulateDifficultyPrompt(question) {
  const questionText = String(question?.text ?? question?.question ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") {
            return String(answer.text ?? "").trim();
          }
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? question?.correctAnswer ?? "").trim();
  const explanation = String(question?.explanation ?? "").trim();

  return `
You are an assistant that classifies trivia questions into a single difficulty level from 1 to 10.

=== RULE ===
Select EXACTLY ONE integer from 1-10.

=== CRITICAL INSTRUCTION ===
Do NOT default to 5.
Level 5 should be used ONLY if the question is truly balanced between common and niche knowledge.
If unsure, choose the closest NON-5 level.

=== DIFFICULTY SCALE ===
1 - Extremely common knowledge (known by nearly everyone worldwide)
2 - Very common knowledge
3 - Common knowledge
4 - Familiar but not universal
5 - Balanced midpoint
6 - Somewhat niche
7 - Niche knowledge
8 - Specialist knowledge
9 - Expert knowledge
10 - Highly obscure

=== DECISION PROCESS (MANDATORY) ===
1. Ask: "Would most adults know this?"
   - Yes -> choose 1-4
2. Else ask: "Would only interested or knowledgeable people know this?"
   - Yes -> choose 6-7
3. Else ask: "Does this require expertise or deep study?"
   - Yes -> choose 8-10
4. Use 5 ONLY if it clearly fits none of the above.

=== PRINCIPLES ===
- Judge the FACT, not the wording.
- If guessable -> lower score.
- If requires recall or exposure -> mid-high.
- If requires study -> high.

Now classify the following trivia question:

Question: ${questionText || "N/A"}
Answers: ${answers.length > 0 ? answers.join(", ") : "N/A"}
Correct Answer: ${correctAnswer || "N/A"}
Explanation: ${explanation || "N/A"}

Respond in strict JSON:
{
  "difficulty_level": <integer 1-10>,
  "difficulty_rationale": "<string explaining reasoning>"
}
  `.trim();
}

module.exports = {
  buildPopulateDifficultyPrompt,
};
