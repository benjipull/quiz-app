function buildQuestionPrompt(categoryName, avoidSection = "") {
  return `
You are an expert trivia question writer. Your goal is to create ONE high-quality,
factually accurate quiz question that is fun, clear, and unambiguous.

=== CATEGORY ===

${categoryName}

=== CORE REQUIREMENTS ===

Your question MUST:

1. **Test exactly one verifiable, widely-accepted fact**
   - The fact must be definitively true and not subject to debate
   - Avoid facts that change frequently (e.g., "most moons as of [year]")
   - Use stable, well-documented facts from reliable sources

2. **Have exactly one unambiguously correct answer**
   - No room for interpretation or debate
   - Not dependent on context, scope, or additional qualifications
   - The correct answer must be universally accepted by experts

3. **Be clear and precise**
   - Keep it to 14 words or fewer when possible
   - Avoid vague terms like "typically," "often," "usually"
   - Don't use "complete the sequence" formats unless the pattern is mathematical or strictly defined

4. **Avoid common pitfalls**:
   - ❌ DON'T ask about rankings that change (e.g., "tallest building," "most populous")
   - ❌ DON'T create "complete the list" questions with arbitrary orderings
   - ❌ DON'T ask questions where multiple answers could be considered correct
   - ❌ DON'T use facts you're uncertain about - only use facts you're 100% confident in
   - ✅ DO ask about historical facts, scientific constants, geographical facts, cultural knowledge
   - ✅ DO verify mentally that you know this fact with absolute certainty

=== ANSWER REQUIREMENTS ===

Provide exactly four plausible answers:

1. All four answers must be the **same type** (e.g., all countries, all numbers, all names)
2. All four answers must be **plausible** in the context of the question
3. The three wrong answers should be reasonable distractors, not obviously wrong
4. Exactly one answer must be unquestionably correct

=== FACTUAL ACCURACY - CRITICAL ===

Before finalizing your question, ask yourself:

- "Am I 100% certain this fact is correct?"
- "Could any credible source disagree with this answer?"
- "Is this fact stable and unlikely to change?"
- "Have I verified this mentally against my knowledge?"

If you have ANY doubt, choose a different fact.

=== EXISTING QUESTIONS TO AVOID ===

${avoidSection || "None (this is the first question for this category)"}

Do NOT create a question that tests the same underlying fact as any existing question,
even if worded differently. Choose a different subtopic or angle within the category.

=== STYLE GUIDELINES ===

- Write naturally, like a good quiz host
- Prefer interesting or surprising facts over the most obvious ones
- Light humor is welcome when natural, but clarity comes first
- Don't force creativity - simple and clear beats clever and confusing

=== OUTPUT FORMAT ===

Return ONLY valid JSON with this exact structure:

{
  "question": "Your question text here",
  "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
  "correct_answer": "The correct answer (must match one of the four answers exactly)",
  "explanation": "A brief 1-2 sentence explanation of why this answer is correct"
}

The explanation should cite the fact and be helpful for learning.

=== FINAL CHECKLIST ===

Before submitting, verify:
- ✓ The fact is 100% accurate and verifiable
- ✓ Only ONE answer is unambiguously correct
- ✓ All four answers are plausible and the same type
- ✓ The question is clear and under 14 words if possible
- ✓ This fact hasn't been tested in existing questions
- ✓ The explanation clearly states why the answer is correct

Now generate your question for the category: ${categoryName}

  `.trim();
  
}

module.exports = { buildQuestionPrompt };
