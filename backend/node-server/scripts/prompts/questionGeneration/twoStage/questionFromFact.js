function buildQuestionFromFactPrompt(fact, factType, categoryName) {
  const templates = {
    characteristic: `
Fact: "${fact}"

Create a trivia question from this fact.

Return STRICT JSON only:
{
  "question": string,
  "answers": [string, string, string, string],
  "correct_answer": string,
  "explanation": string
}

Example:
Fact: "Octopuses have three hearts"
{"question": "How many hearts does an octopus have?", "answers": ["Two", "Three", "Four", "One"], "correct_answer": "Three", "explanation": "Octopuses have three hearts that pump blood through their body."}

Rules:
- 4 different answers
- correct_answer must match one answer exactly
- Keep question short
`,

    sequence: `
Fact: "${fact}"

Create a "complete the phrase" question ending with "..."

Return JSON:
{"question": "The sequence is A, B, C, ...", "answers": ["D", "E", "F", "G"], "correct_answer": "D", "explanation": "explanation"}

Example:
Fact: "Mars is the 4th planet from the Sun"
{"question": "Planets from the Sun: Mercury, Venus, Earth, ...", "answers": ["Mars", "Jupiter", "Saturn", "Uranus"], "correct_answer": "Mars", "explanation": "Mars is the 4th planet from the Sun."}

Rules:
- End with "..."
- Include context (e.g., "from the Sun")
- 4 answers, one correct
`,

    identity: `
Fact: "${fact}"

Create a trivia question from this fact.

Return JSON:
{"question": "your question?", "answers": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "explanation"}

Example:
Fact: "Neil Armstrong was the first person to walk on the Moon in 1969"
{"question": "Who first walked on the Moon?", "answers": ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Alan Shepard"], "correct_answer": "Neil Armstrong", "explanation": "Neil Armstrong walked on the Moon in 1969."}

Rules:
- 4 different answers
- One correct answer
`,

    comparison: `
Fact: "${fact}"

Create a trivia question from this fact.

Return JSON:
{"question": "your question?", "answers": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "explanation"}

Example:
Fact: "Jupiter has 95 moons as of 2025, the most of any planet"
{"question": "Which planet has the most moons?", "answers": ["Jupiter", "Saturn", "Uranus", "Neptune"], "correct_answer": "Jupiter", "explanation": "Jupiter has 95 moons as of 2025."}

Rules:
- Include context from fact ("as of 2025")
- 4 answers, one correct
`,
  };

  const template = templates[factType] || templates.characteristic;
  return template.trim();
}

module.exports = buildQuestionFromFactPrompt;
