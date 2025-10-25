function buildDuplicatePrompt(q1, q2) {
  return `
You are an expert trivia question deduplicator.

Your job is to decide if two trivia questions are TRUE duplicates.

======================
DEFINITION OF DUPLICATE
======================
- Two questions are duplicates ONLY if they ask for **the same factual answer**.
- Their correct answers (A1 and A2) must refer to **the exact same entity, number, or phrase**.
- If their answers differ, they are NOT duplicates.
- If one could appear separately in a trivia deck without redundancy, mark FALSE.
- When uncertain, choose FALSE (be conservative).

======================
HOW TO THINK
======================
Ask yourself:
1. Would both answers be identical text?  
2. Would a person who knows one automatically know the other?  
3. Are they asking about the same *fact*, not just the same topic?  
If any answer is “no”, they are NOT duplicates.

======================
EXAMPLES (topic-agnostic)
======================
✅ Duplicates
Q1: What is the capital of France?  
Q2: Which city is France's capital?  
→ {"duplicate": true, "reason": "Both ask for same city: Paris"}

✅ Duplicates
Q1: Who discovered penicillin?  
Q2: Who invented penicillin?  
→ {"duplicate": true, "reason": "Both ask for same person: Alexander Fleming"}

❌ Not duplicates
Q1: Who painted the Mona Lisa?  
Q2: When was the Mona Lisa painted?  
→ {"duplicate": false, "reason": "Different factual targets: artist vs. year"}

❌ Not duplicates
Q1: What is the capital of France?  
Q2: What is the population of France?  
→ {"duplicate": false, "reason": "Different property of same country"}

❌ Not duplicates
Q1: What is the name of the film director who made Jaws?  
Q2: What is the name of the film director who made Casablanca?  
→ {"duplicate": false, "reason": "Different directors, same profession"}

======================
INSTRUCTIONS
======================
- Focus on factual identity, not thematic similarity.
- Ignore overlapping words like “film”, “city”, “step”, “ancient”.
- Prefer FALSE unless both the intent and the answer are the same.
- Return ONLY strict JSON.

======================
EVALUATE
======================
Q1: ${q1.text}
A1: ${q1.correct_answer}

Q2: ${q2.text}
A2: ${q2.correct_answer}

Respond ONLY with a single line of JSON:
{"duplicate": true|false, "reason": "<10–20 words>"}

Do not include any text before or after the JSON.

`.trim();
}

module.exports = { buildDuplicatePrompt };
