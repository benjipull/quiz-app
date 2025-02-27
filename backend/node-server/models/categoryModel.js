const mongoose = require("mongoose");

// ✅ Schema for individual answers
const AnswerSchema = new mongoose.Schema({
    text: { type: String, required: true },
    correctCount: { type: Number, default: 0 }, // ✅ Tracks how many times this answer was chosen correctly
    incorrectCount: { type: Number, default: 0 } // ✅ Tracks how many times this answer was chosen incorrectly
});

// ✅ Schema for questions
const QuestionSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // ✅ Unique ObjectId for each question
    text: { type: String, required: true }, // ✅ Question text
    answers: [AnswerSchema], // ✅ Array of possible answers
    correct_answer: { type: String, required: true }, // ✅ Stores the correct answer text
    explanation: { type: String, default: "" }, // ✅ Explanation of correct answer
    timesLoaded: { type: Number, default: 0 }, // ✅ Tracks how many times the question has been loaded
    popularity: { type: Number, default: 0 }, // ✅ Tracks likes/dislikes balance
    disabled: { type: Boolean, default: false }, // ✅ Allows disabling a question
    timesAnsweredCorrectly: { type: Number, default: 0 }, // ✅ Tracks how many times the question was answered correctly
    timesAnsweredIncorrectly: { type: Number, default: 0 }, // ✅ Tracks how many times the question was answered incorrectly
    hash: { type: String, required: true, unique: true } // ✅ Unique hash to prevent duplicate questions
});

// ✅ Schema for quiz completions
const CompletionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ User who completed the quiz
    questionsAttempted: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    incorrectAnswers: { type: Number, required: true },
}, { timestamps: true }); // ✅ Auto-adds createdAt & updatedAt timestamps

// ✅ Schema for quiz categories
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // ✅ Category name
    disabled: { type: Boolean, default: false }, // ✅ Disabled until it is filled with questions
    imageUrl: { type: String }, // ✅ Category image URL
    createdAt: { type: Date, default: Date.now }, // ✅ Timestamp for creation
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Tracks who created the category
    completions: [CompletionSchema], // ✅ Tracks quiz completions
    questions: [QuestionSchema], // ✅ Array of questions inside the category
    ratings: [{ type: Number, min: 1, max: 5 }], // ✅ Store all individual ratings
    averageRating: { type: Number, default: 0 }  // ✅ Store the computed average rating
});

module.exports = mongoose.model("Category", CategorySchema);
