function buildDomainPrompt(question) {
  const questionText = String(question?.text ?? "").trim();
  const correctAnswer = String(question?.correct_answer ?? "").trim();

  return `
Classify the trivia question domain.

Domains with one authoritative official answer (TRUE):
- professional certifications (e.g., CCSP, CISSP),
- exams with fixed durations or score thresholds,
- biology facts (e.g., number of bones in the human body),
- geography facts (e.g., capital cities),
- historical dates/events,
- scientific constants or definitions,
- standardized specs (e.g., official units, ISO standards),
- legal definitions.

If the answer is standardized worldwide or by an official body -> TRUE.

Return ONLY strict JSON (no extra text):

{
  "has_authoritative_answer": true|false,
  "domain": "<short domain>"
}

Question: ${questionText}
Correct Answer: ${correctAnswer}
  `.trim();
}

function buildPrimaryPrompt(question, authoritative) {
  const questionText = String(question?.text ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") return String(answer.text ?? "").trim();
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? "").trim();
  const explanation = String(question?.explanation ?? "N/A").trim();

  return `
You are a formal trivia question validator.

Your task is to determine if a trivia question's "correct answer" and "explanation" are factual, self-consistent, and appropriately specific.

IMPORTANT:
- Authoritative Domain = ${authoritative}
- If Authoritative Domain is true (e.g., certifications, standardized facts), then the question is expected to have ONE official correct answer defined by some authority.
- In authoritative domains, words like "typical", "usually", "generally" or "commonly" usually refer to that official standard and do NOT automatically make the question ambiguous.

Rules:

1) FACT CHECK
- Evaluate whether the provided "correct answer" matches real-world knowledge.
- If it is factually false, mark final_verdict = "Incorrect".

2) INTERNAL CONSISTENCY
- If the explanation disagrees with the answer -> "Incorrect".
- If the explanation does not clearly justify the correct answer -> "Ambiguous".
- If the explanation supports the answer -> continue.

3) MULTIPLE VALID ANSWERS
- If Authoritative Domain = true:
  - Only treat as "Ambiguous" if there are genuinely multiple officially recognized correct answers.
- If Authoritative Domain = false:
  - If the question naturally allows several different correct answers (e.g. "a reason", "a popular X", "a city known for..."), you may mark "Ambiguous".

4) FINAL DECISION
- Factual answer wrong -> "Incorrect".
- Explanation contradicts answer -> "Incorrect".
- Multiple plausible answers (non-authoritative domain) -> "Ambiguous".
- Explanation vague/partial but not clearly wrong -> "Ambiguous".
- Everything factually correct and well supported -> "Correct".

Return ONLY valid JSON, no markdown, no prose:

{
  "is_correct_answer_valid": true|false,
  "correct_answer_reasoning": "<why correct or not>",
  "explanation_consistent": true|false,
  "explanation_reasoning": "<why consistent or not>",
  "other_answers_possible": ["<answer1>", "<answer2>"],
  "final_verdict": "Correct" | "Incorrect" | "Ambiguous"
}

Question: ${questionText}
Answers: ${answers.join(", ")}
Correct Answer: ${correctAnswer}
Explanation: ${explanation || "N/A"}
  `.trim();
}

function buildCriticPrompt(question, authoritative) {
  const questionText = String(question?.text ?? "").trim();
  const correctAnswer = String(question?.correct_answer ?? "").trim();
  const explanation = String(question?.explanation ?? "N/A").trim();

  return `
Act as a strict but factual adversarial critic of a trivia question.

Your job is to try to find issues with the given correct answer, but you MUST obey these constraints:

- DO NOT invent alternative answers.
- Only list alternative_answers if they are official, factual, and widely recognized as valid answers to this specific question.
- If you are uncertain about an alternative, DO NOT include it.
- If Authoritative Domain = true, alternative official answers should be extremely rare.

Return ONLY strict JSON:

{
  "has_issue": true|false,
  "issue_type": "Incorrect" | "Ambiguous" | "None",
  "reasons": "<describe the strongest issues you find, or 'None'>",
  "alternative_answers": ["<alt1>", "<alt2>"]
}

Authoritative Domain: ${authoritative}

Question: ${questionText}
Correct Answer: ${correctAnswer}
Explanation: ${explanation || "N/A"}
  `.trim();
}

function buildIndependentPrompt(question, authoritative) {
  const questionText = String(question?.text ?? "").trim();
  const correctAnswer = String(question?.correct_answer ?? "").trim();

  return `
You are performing a factual check of a trivia question.

IMPORTANT:
- Ignore the explanation completely. Do NOT rely on it for facts.
- Consider only the question text and the provided correct answer.
- If Authoritative Domain = true, expect a single official correct answer.
- DO NOT hallucinate ranges or alternative answers unless they are truly official, widely accepted factual alternatives.

Return ONLY strict JSON:

{
  "is_factually_correct": true|false,
  "alternative_correct_answers": ["<alt1>", "<alt2>"],
  "reasons": "<short factual justification>",
  "verdict": "Correct" | "Incorrect" | "Ambiguous"
}

Authoritative Domain: ${authoritative}

Question: ${questionText}
Correct Answer: ${correctAnswer}
  `.trim();
}

function buildAmbiguityFixabilityPrompt(question) {
  const questionText = String(question?.text ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") return String(answer.text ?? "").trim();
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? "").trim();

  return `
You are a strict ambiguity classifier for trivia questions.

Your task is to determine whether the ambiguity in the question can be resolved ONLY by rewording the question.

IMPORTANT:
- DO NOT evaluate correctness of the answer.
- Assume the correct answer is factually correct.
- Focus ONLY on the nature of the ambiguity.

A question is FIXABLE if:
- The ambiguity comes from wording (e.g. vague terms, missing scope, approximation like "a third")
- It can be resolved by clarifying or rephrasing WITHOUT changing:
  - the correct answer
  - the answer options
  - the underlying fact

A question is NOT FIXABLE if:
- Multiple fundamentally different answers could be correct even after rewording
- The question is subjective or opinion-based
- The question asks for "a", "one of", "a type of", "a popular"
- The concept itself is too broad or undefined

Return STRICT JSON only:

{
  "can_be_fixed_by_rewording": true|false,
  "ambiguity_type": "scope" | "approximation" | "vague_wording" | "subjective" | "multiple_valid_answers" | "other",
  "reasoning": "<short explanation>"
}

Question: ${questionText}
Answers: ${answers.join(", ")}
Correct Answer: ${correctAnswer}
  `.trim();
}

function buildAmbiguityFixPrompt(question, reasoning) {
  const questionText = String(question?.text ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") return String(answer.text ?? "").trim();
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? "").trim();
  const fixReasoning = String(reasoning ?? "").trim();

  return `
You are a trivia question editor.

Your task is to FIX the question to remove ambiguity.

STRICT RULES:
- DO NOT change the correct answer
- DO NOT change the underlying fact
- DO NOT change the answer options
- ONLY modify the wording of the question
- Keep it natural and engaging
- Maximum 14 words
- Ensure the question has exactly ONE clear correct answer
- Avoid vague terms like:
  - "wild"
  - "a third"
  - "commonly"
  - "often"
  - "usually"
  unless clearly qualified

Return STRICT JSON only:

{
  "fixed_question": "<rewritten question>"
}

Original Question: ${questionText}
Correct Answer: ${correctAnswer}
Answers: ${answers.join(", ")}
Reason for ambiguity: ${fixReasoning}
  `.trim();
}

function buildIncorrectAnswerFixPrompt(question, reasoning) {
  const questionText = String(question?.text ?? "").trim();
  const answers = Array.isArray(question?.answers)
    ? question.answers
        .map((answer) => {
          if (answer && typeof answer === "object") return String(answer.text ?? "").trim();
          return String(answer ?? "").trim();
        })
        .filter(Boolean)
    : [];
  const correctAnswer = String(question?.correct_answer ?? "").trim();
  const explanation = String(question?.explanation ?? "N/A").trim();
  const fixReasoning = String(reasoning ?? "").trim();

  return `
You are a trivia quality fixer.

The validator marked the current correct answer as factually incorrect.
Your task is to select the corrected answer.

STRICT RULES:
- Choose the corrected answer from the provided answer options only.
- Return the answer text exactly as written in the options.
- Do NOT rewrite the question text.
- Do NOT rewrite answer options.
- If no option can be defended as correct, return an empty string.

Return STRICT JSON only:

{
  "fixed_correct_answer": "<exact answer option text or empty string>",
  "reasoning": "<short factual explanation>"
}

Question: ${questionText}
Answers: ${answers.join(", ")}
Current Correct Answer: ${correctAnswer}
Explanation: ${explanation || "N/A"}
Validation Reasoning: ${fixReasoning}
  `.trim();
}

module.exports = {
  buildDomainPrompt,
  buildPrimaryPrompt,
  buildCriticPrompt,
  buildIndependentPrompt,
  buildAmbiguityFixabilityPrompt,
  buildAmbiguityFixPrompt,
  buildIncorrectAnswerFixPrompt,
};
