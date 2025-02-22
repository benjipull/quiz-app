const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
    text: { type: String, required: true },
    correctCount: { type: Number, default: 0 }, // ✅ Times this answer was selected correctly
    incorrectCount: { type: Number, default: 0 } // ✅ Times this answer was selected incorrectly
});

// ✅ Question Schema
const QuestionSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // ✅ Unique ID for each question
    text: { type: String, required: true },
    answers: [AnswerSchema], // ✅ Each answer has stats
    correct_answer: { type: String, required: true },
    explanation: { type: String },
    timesLoaded: { type: Number, default: 0 }, // ✅ How many times this question was loaded
    likes: { type: Number, default: 0 }, // ✅ Net likes (upvotes - downvotes)
    hash: { type: String, required: true, unique: true }, // ✅ Unique identifier for question
    disabled: { type: Boolean, default: false }, // ✅ Mark if the question is disabled
    timesAnsweredCorrectly: { type: Number, default: 0 }, // ✅ Tracks overall correct attempts
    timesAnsweredIncorrectly: { type: Number, default: 0 } // ✅ Tracks overall incorrect attempts
});

// ✅ Category Schema
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completions: [{ 
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        questionsAttempted: { type: Number, required: true },
        correctAnswers: { type: Number, required: true },
        incorrectAnswers: { type: Number, required: true }
    }],
    questions: [QuestionSchema] // ✅ Attach questions array
});

module.exports = mongoose.model("Category", CategorySchema);
