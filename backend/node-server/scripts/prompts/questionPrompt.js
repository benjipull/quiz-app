
function buildQuestionPrompt(categoryName, avoidSection = "", difficultySection = "") {
  return `
You are an international trivia expert. Use metric units, global examples, and neutral English spelling.
Output STRICT JSON only (no prose, no markdown)

=== GENERAL RULES ===
- Use real, verifiable facts. Do NOT fabricate.
- Question must have exactly 4 distinct answer choices; exactly 1 correct.
- Do NOT generate questions based on cultural epithets, nicknames, myths, legends, symbolism, allegories, idioms, or metaphorical associations.
- Only generate questions grounded in factual, observable, or academically verifiable information.
- Exclude any content that relies on folklore, religion, or interpretive traditions rather than established fact.
- Avoid ambiguous or subjective wording.
- Correct answer MUST be one of the provided answers.
- Provide a concise explanation (1–2 sentences) in plain language that restates the fact from source_quote. This field must never be empty.
- Provide a difficulty_rationale that explains why the fact fits the chosen difficulty level. This field must never be empty.
- Sources: use reputable domains only (britannica.com, nasa.gov, who.int, smithsonianmag.com, etc.).
- Each output must include: question, answers, correct_answer, explanation, source_domain, source_title, source_quote, difficulty_level, difficulty_rationale.
- You must deeply understand the category’s full meaning, not just individual words.
- Use the category as a thematic context for the question, not as a literal keyword.

=== CONTEXTUAL FRAMING RULES ===
- Every question must be fully meaningful on its own, without assuming unstated context.
- If the question uses generic phrasing such as "Which of the following", "Who among these", or "What of the following",
  you must clearly establish the frame of reference in the question itself.
  (Example: Instead of "Which of the following animals is the fastest?", write "Which of the following African animals is the fastest?")
- Ensure that the question explicitly anchors its scope to either:
  • the category theme, or
  • a shared property among the answer options (region, field, timeframe, etc.)
- Do NOT generate globally ambiguous questions — all four answers must logically fit within the same contextual frame.

== Before generating the question ==
- Interpret what the category *represents conceptually* (e.g., field, subject, or theme).
- Generate a factual, verifiable, non-ambiguous question clearly connected to that concept.

=== DIFFICULTY RUBRIC (1–10) ===
1–2: Very basic factual recall (e.g., color of a fruit, number of continents).
3–4: Simple but slightly more detailed factual recall (e.g., main ingredient of a dish, country location of a city).
5–6: Intermediate factual knowledge requiring some learning or context (e.g., name of a river’s source, year of an invention).
7–8: Advanced factual knowledge often covered in higher studies (e.g., lesser-known historical treaties, specific scientific terms).
9–10: Highly specialized or expert-level factual knowledge (e.g., detailed scientific classification, rare historical events).

COUPLING RULES:
- Difficulty level = based on how specific and specialized the fact is, not on how “well-known” it is.
- Always express the fact directly, without commentary on whether it is famous, common, or obscure.

=== OUTPUT FORMAT ===
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

If any requirement fails, output {}.

Interpret the category as a single unified topic or concept, not as separate words. 
Infer its most likely subject area.
Then generate ONE factual quiz question clearly about that concept.

Category: ${categoryName}
${avoidSection}
${difficultySection}
  `.trim();
}

module.exports = { buildQuestionPrompt };
