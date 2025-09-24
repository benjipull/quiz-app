const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
    text: { type: String, required: true },
    correctCount: { type: Number, default: 0 }
});

const QuestionSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    
    answers: [AnswerSchema],
    correct_answer: { type: String, required: true },
    explanation: { type: String, default: "" },

    source_domain: { type: String, default: "" },
    source_title: { type: String, default: "" },
    source_quote: { type: String, default: "" },

    timesLoaded: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    timesAnsweredCorrectly: { type: Number, default: 0 },
    timesAnsweredIncorrectly: { type: Number, default: 0 },
    
    difficulty_level: { type: Number, default: 0 },
    difficulty_rationale: {type :String, default: ""},
    difficultyConfirmedVersion: { type: Number, default: 0 },

    hash: { type: String, required: true, unique: true },
    version: { type: Number, default: 1, required: true}
});


const CompletionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who completed the quiz
    questionsAttempted: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    incorrectAnswers: { type: Number, required: true },
}, { timestamps: true }); // Auto-adds createdAt & updatedAt timestamps


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
