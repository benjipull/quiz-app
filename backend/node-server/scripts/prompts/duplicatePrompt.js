function buildDuplicatePrompt(q1, q2) {
  return `
You are an expert in trivia question deduplication. Your task is to decide if two questions are TRUE factual duplicates.

======================
STRICT DEFINITION
======================
Two questions are TRUE duplicates **only if**:
1. They ask for **the exact same factual answer**, not just a related one.
2. Their correct answers (A1 and A2) are **identical in meaning**, referring to the *same specific entity, date, number, or phrase*.
3. A correct response to one question would *100% answer the other* with no difference in detail or phrasing.

If they differ in *focus, granularity, context, or framing*, they are **not duplicates**.

======================
CONSERVATIVE PRINCIPLES
======================
- Assume **not duplicates** unless identical in factual intent and answer.
- Similar topic ≠ duplicate.
- Same subject ≠ duplicate.
- Paraphrased wording with *different factual targets* ≠ duplicate.
- If unsure, choose **{"duplicate": false}**.

======================
HOW TO THINK
======================
Ask yourself:
1. Do both questions ask for the **same real-world fact**?
2. Would both be answered with **exactly the same text** (not just same category)?
3. Are both answers the **same unique concept** (same person, same year, same event, etc.)?
If *any* answer is “no” → mark as **not duplicate**.

======================
STRICT EXAMPLES
======================
✅ Duplicates  
Q1: What is the capital of France?  
Q2: Which city is France's capital?  
→ {"duplicate": true, "reason": "Both ask for same city: Paris"}

✅ Duplicates  
Q1: Who discovered penicillin?  
Q2: Who invented penicillin?  
→ {"duplicate": true, "reason": "Same person: Alexander Fleming"}

❌ Not duplicates  
Q1: Who painted the Mona Lisa?  
Q2: When was the Mona Lisa painted?  
→ {"duplicate": false, "reason": "Different factual target: artist vs year"}

❌ Not duplicates  
Q1: What is the capital of France?  
Q2: What is the population of France?  
→ {"duplicate": false, "reason": "Different property of same entity"}

❌ Not duplicates  
Q1: What is the name of the director who made Jaws?  
Q2: What is the name of the director who made Casablanca?  
→ {"duplicate": false, "reason": "Different directors"}

❌ Not duplicates  
Q1: What is the largest ocean on Earth?  
Q2: What is the deepest ocean trench?  
→ {"duplicate": false, "reason": "Different factual type"}

======================
EVALUATION RULES
======================
- Overlap in topic or wording alone is **not enough**.
- Two questions about the same subject are not duplicates unless they ask for *the same fact*.
- When in doubt, **say false**.
- Be concise and objective.
- Output must be **only valid JSON**.

======================
QUESTIONS TO EVALUATE
======================
Q1: ${q1.text}  
A1: ${q1.correct_answer}

Q2: ${q2.text}  
A2: ${q2.correct_answer}

Respond ONLY with:
{"duplicate": true|false, "reason": "<short reason in 10–20 words>"}
`.trim();
}

module.exports = { buildDuplicatePrompt };
