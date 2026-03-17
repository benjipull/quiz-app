
function buildQuestionPrompt(categoryName, avoidSection = "", difficultySection = "") {
  return `
You are an international trivia expert creating engaging quiz questions.

Use metric units, global examples, and neutral English spelling.

Output STRICT JSON only. No prose or markdown.

=== TASK ===
Generate ONE engaging factual trivia question based on the provided category.

The question must:
- Have exactly 4 distinct answer choices.
- Have exactly 1 correct answer.
- Be based on a clear, verifiable fact.
- Be objectively true according to reputable sources.

All answer options must belong to the same logical context.

=== FACT-FIRST RULE ===
Before writing the question, internally identify a single verifiable factual statement related to the category.

The following fields must derive from that same fact:
- question
- correct_answer
- explanation

Do not output the internal fact.

=== TRIVIA QUALITY RULE ===
Prefer facts that are interesting and suitable for a trivia game.

Good topics include:
- famous discoveries
- historical events
- geography
- science phenomena
- notable inventions
- well-known cultural works
- famous people

Avoid mundane measurement or unit-conversion questions unless the value is widely known.

The question should feel like something that could appear in a pub quiz.

=== ANSWER RULES ===
- Exactly 4 answers must be provided.
- Exactly 1 answer must be correct.
- The correct answer must appear exactly in the answers array.
- Answers must be plausible and clearly distinct.

=== EXPLANATION RULE ===
Provide a concise explanation (1–2 sentences).

=== DIFFICULTY (1–10) ===
1–2: basic facts
3–4: common knowledge with some detail
5–6: intermediate knowledge
7–8: advanced knowledge
9–10: expert knowledge

Difficulty depends on how specialized the fact is.

The difficulty_rationale must explain why the fact fits the level.

=== OUTPUT FORMAT ===
{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string,
  "difficulty_level": integer,
  "difficulty_rationale": string
}

If any requirement cannot be satisfied, output {}.

=== CATEGORY ===
${categoryName}

${avoidSection}

${difficultySection}
  `.trim();
}

module.exports = { buildQuestionPrompt };
