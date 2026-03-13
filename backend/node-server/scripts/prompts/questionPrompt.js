
function buildQuestionPrompt(categoryName, avoidSection = "", difficultySection = "") {
  return `
You are an international trivia expert. Use metric units, global examples, and neutral English spelling.

Output STRICT JSON only (no prose, no markdown).

=== CORE TASK ===
Generate ONE factual trivia question based on the provided category.

The question must:
- Have exactly 4 distinct answer choices.
- Have exactly 1 correct answer.
- Be based on a clear, verifiable fact.
- Be objectively true according to a reputable source.

All answers must belong to the same logical context so the question is unambiguous.

=== FACT-FIRST GENERATION RULE ===
Before generating the question, internally identify a single verifiable factual statement from a reputable source related to the category.

The following fields must all derive from that same fact:
- question
- correct_answer
- explanation

Do NOT invent a fact while writing the question.

Do NOT output the internal fact-selection step.

=== FACTUAL CONSTRAINTS ===
All questions must be grounded in objective, academically verifiable facts.

Do NOT generate questions that rely on:
- statistics, surveys, or datasets
- rankings, popularity, or frequency
- cultural reputation, informal naming, or nicknames
- folklore, myths, religious traditions, or symbolism
- opinions, interpretations, or societal perceptions
- behavioral tendencies of populations or groups

The correctness of the answer must be deterministically true.

=== QUESTION QUALITY RULES ===
- Avoid ambiguous wording.
- Avoid subjective language.
- Do not use phrases implying opinion or reputation (e.g., “considered”, “widely known as”, “thought to be”).
- The question must be fully understandable without additional context.
- All four answer options must logically belong to the same contextual frame.

=== ANSWER RULES ===
- Exactly 4 answers must be provided.
- Exactly 1 answer must be correct.
- The correct answer MUST appear exactly in the answers array.
- Answers must be distinct and plausible within the question context.

=== EXPLANATION RULES ===
- Provide a concise explanation (1–2 sentences).
- This field must never be empty.

=== DIFFICULTY RUBRIC (1–10) ===
1–2: Very basic factual recall (e.g., color of a fruit, number of continents)
3–4: Simple factual recall with slight detail
5–6: Intermediate factual knowledge requiring some learning or context
7–8: Advanced factual knowledge often covered in higher studies
9–10: Highly specialized or expert-level factual knowledge

=== DIFFICULTY RULE ===
Difficulty is determined by how specific or specialized the fact is, NOT by how well-known it is.

The difficulty_rationale must explain why the fact fits the chosen difficulty level.

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

=== CATEGORY INTERPRETATION ===
Interpret the category as a single unified topic or concept, not as separate words.
Infer its most likely subject area.

Generate ONE factual quiz question clearly about that concept.

Category: ${categoryName}

${avoidSection}

${difficultySection}
  `.trim();
}

module.exports = { buildQuestionPrompt };
