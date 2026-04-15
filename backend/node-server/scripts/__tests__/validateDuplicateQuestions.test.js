const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pickOldestVersionQuestion,
  buildDisableDuplicateGroupUpdate,
} = require("../validateDuplicateQuestions");

test("pickOldestVersionQuestion returns the question with the lowest version", () => {
  const group = [
    { _id: "q-1", version: 5 },
    { _id: "q-2", version: 2 },
    { _id: "q-3", version: 3 },
  ];

  const selected = pickOldestVersionQuestion(group);

  assert.equal(selected._id, "q-2");
});

test("pickOldestVersionQuestion keeps one question even when versions tie", () => {
  const group = [
    { _id: "q-1", version: 2 },
    { _id: "q-2", version: 2 },
    { _id: "q-3", version: 2 },
  ];

  const selected = pickOldestVersionQuestion(group);

  assert.ok(selected);
  assert.equal(selected.version, 2);
  assert.ok(group.some((question) => question._id === selected._id));
});

test("buildDisableDuplicateGroupUpdate disables every duplicate except the kept question", () => {
  const questionIds = ["q-1", "q-2", "q-3"];
  const keepQuestionId = "q-2";

  const payload = buildDisableDuplicateGroupUpdate(questionIds, keepQuestionId);

  assert.deepEqual(payload, {
    $set: {
      "questions.$[elem].disabled": true,
      "questions.$[elem].disabled_reason": "Marked as duplicate",
    },
    arrayFilters: [
      {
        "elem._id": {
          $in: questionIds,
          $ne: keepQuestionId,
        },
      },
    ],
  });
});
