
function buildQuestionPrompt(categoryName, avoidSection = "", difficultySection = "") {
  return `
You are a fun quiz game generator. Use metric units, global examples, and neutral English spelling.
Output STRICT JSON only (no prose, no markdown).

=====================
GENERAL GENERATION RULES
=====================
- Use only real, verifiable facts. No fabrication.
- Exactly 1 question, 4 answer choices, 1 correct answer.
- No ambiguous, interpretive, subjective, or culturally-dependent phrasing.
- Explanations must restate the factual point in 1–2 clear sentences.
- Provide: question, answers, correct_answer, explanation, source_domain, source_title, source_quote, difficulty_level, difficulty_rationale.
- Category must shape the conceptual theme of the question—not just appear as a keyword.
- Facts must fall within: definitions, functions, structures, authorship, properties, historical events, or other academically verifiable domains.
- Use only reputable factual sources (britannica.com, nasa.gov, who.int, smithsonianmag.com, etc.)

=====================
FORBIDDEN CONTENT
=====================
Do NOT generate:
- statistics, surveys, trends, proportions, frequencies, rankings.
- numbers as correct answers (years, counts, quantities, ages, measurements).
- terms like: “considered”, “believed”, “thought to be”, “often referred to as”, “commonly called”, “widely known as”.
- qualifiers like “main”, “major”, “primary”, “most important”.
- opinions, customs, symbolism, metaphors, folklore, myth, tradition.
- questions whose validity depends on behavioural tendencies, cultural norms, or population variation.

=====================
CONTEXT RULES
=====================
- Question must be fully self-contained and unambiguous.
- If using “Which of the following…”, explicitly define the scope.
- All answer options must share the same frame of reference.
- The question must clearly belong to the unique meaning of the given category and not overlap with other categories.

=====================
DIFFICULTY SYSTEM (1–20)
=====================
1–2: extremely basic, universally obvious, no schooling required.  
3–4: very easy recognition.  
5–6: simple general knowledge.  
7–10: school-level factual knowledge.  
11–14: advanced academic details.  
15–20: specialised expert-level facts.


=====================
OUTPUT FORMAT (STRICT)
=====================
{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string,
  "source_domain": string,
  "source_title": string,
  "source_quote": string,
  "difficulty_level": integer,
  "difficulty_rationale": string
}

If any rule cannot be satisfied, output {}.

Category: ${categoryName}
${avoidSection}

difficulty_level: 1
difficulty_label: "very easy"

Generate a question that strictly matches difficulty_level 1 as defined in the difficulty system.

  `.trim();
}

//${difficultySection}
module.exports = { buildQuestionPrompt };
