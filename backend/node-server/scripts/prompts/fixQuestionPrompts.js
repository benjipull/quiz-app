/**
 * Prompts for fixing failed validation questions
 */

function buildFixAmbiguousQuestionPrompt(question, validationData) {
  const { ambiguity_type, ambiguity_reasoning, other_answers_possible } = validationData;

  return `
You are a trivia question expert. Fix this AMBIGUOUS question to make it unambiguous while keeping the same correct answer.

ORIGINAL QUESTION:
Question: ${question.text}
Answers: ${question.answers.join(", ")}
Correct Answer: ${question.correct_answer}
Explanation: ${question.explanation}

VALIDATION FAILURE DETAILS:
Ambiguity Type: ${ambiguity_type}
Reasoning: ${ambiguity_reasoning}
Other Possible Answers Detected: ${other_answers_possible.join(", ") || "None specified"}

YOUR TASK:
Fix the question to eliminate ambiguity. You can:
1. Add missing context (ordering principle, scope, measurement criteria)
2. Make the question more specific
3. Add clarifying details
4. Adjust the question wording to exclude alternative interpretations

CRITICAL RULES:
- Keep the same correct answer: "${question.correct_answer}"
- Keep the same answer options (you can reorder them)
- Question MUST be ≤14 words (STRICT LIMIT - count every word including articles)
- Must be clear and unambiguous
- Must have only ONE correct answer among the options
- Add context WITHIN the existing question structure, don't just append to the end

SPECIFIC FIXES BY AMBIGUITY TYPE:
- scope: Add explicit scope/domain (e.g., "in Europe", "in the solar system", "as of 2025")
- vague_wording: Add specific context about what's being asked
- approximation: Use exact values or specify "approximately"
- other: Analyze the reasoning and add necessary context

Return STRICT JSON only:
{
  "fixed_question": string,
  "fixed_explanation": string,
  "fix_applied": boolean,
  "fix_reasoning": string
}

If the question cannot be fixed without changing the correct answer or answer options, set fix_applied to false and explain why in fix_reasoning.
`.trim();
}

function buildFixIncorrectQuestionPrompt(question, validationData) {
  const { correct_answer_reasoning, other_answers_possible } = validationData;

  return `
You are a trivia question expert. Fix this FACTUALLY INCORRECT question.

ORIGINAL QUESTION:
Question: ${question.text}
Answers: ${question.answers.join(", ")}
Correct Answer (marked as WRONG): ${question.correct_answer}
Explanation: ${question.explanation}

VALIDATION FAILURE DETAILS:
Reasoning: ${correct_answer_reasoning}
Alternative Correct Answers Detected: ${other_answers_possible.join(", ") || "None"}

YOUR TASK:
Fix the question to be factually correct. You have these options:

1. CHANGE CORRECT ANSWER: If one of the existing answer options is actually correct, change which answer is marked correct
   - Example: If validation says "Jupiter has 95 moons, Saturn has 146", and Saturn is in the answer options, make Saturn correct
   - PREFERRED STRATEGY when validation identifies the true correct answer among existing options
2. REWRITE QUESTION: Rewrite the question so the current correct answer IS actually correct
   - Example: If Mars is marked correct but isn't the 4th planet, ask a different question where Mars IS correct
   - Use this when the current answer isn't actually wrong, just doesn't match the question
3. UNFIXABLE: If neither option works, explain why

IMPORTANT:
- First analyze the validation reasoning carefully to understand what the actual facts are
- If validation explicitly states another answer is correct, use strategy "change_answer"
- Question must be ≤14 words (STRICT LIMIT)

CRITICAL RULES:
- Maintain the same general topic/category
- Keep 4 answer options
- Question MUST be ≤14 words (count every word)
- Must be factually accurate and verifiable
- Prioritize option 1 (changing correct answer) if validation identifies correct answer

Return STRICT JSON only:
{
  "fix_strategy": "change_answer" | "rewrite_question" | "unfixable",
  "fixed_question": string,
  "fixed_correct_answer": string,
  "fixed_explanation": string,
  "fixed_answers": [string, string, string, string],
  "fix_reasoning": string
}

If fix_strategy is "change_answer", keep fixed_question the same and just change fixed_correct_answer.
If fix_strategy is "rewrite_question", provide new question text that makes the original correct answer valid.
If fix_strategy is "unfixable", explain why in fix_reasoning.
`.trim();
}

function buildFixInconsistentExplanationPrompt(question, validationData) {
  const { explanation_reasoning } = validationData;

  return `
You are a trivia question expert. Fix the EXPLANATION for this question.

QUESTION:
Question: ${question.text}
Answers: ${question.answers.join(", ")}
Correct Answer: ${question.correct_answer}
Current Explanation: ${question.explanation}

VALIDATION FAILURE:
The explanation is inconsistent with the question/answer.
Reasoning: ${explanation_reasoning}

YOUR TASK:
Write a new explanation (1-2 sentences) that:
- Clearly explains why "${question.correct_answer}" is the correct answer
- Is factually accurate
- Is consistent with the question
- Provides helpful context

Return STRICT JSON only:
{
  "fixed_explanation": string,
  "fix_reasoning": string
}
`.trim();
}

module.exports = {
  buildFixAmbiguousQuestionPrompt,
  buildFixIncorrectQuestionPrompt,
  buildFixInconsistentExplanationPrompt,
};
