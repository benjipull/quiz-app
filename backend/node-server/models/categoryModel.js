const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
    text: { type: String, required: true },
    correctCount: { type: Number, default: 0 }
});

const ValidationSchema = new mongoose.Schema({
    is_correct_answer_valid: { type: Boolean, default: false },
    correct_answer_reasoning: { type: String, default: "" },
    explanation_consistent: { type: Boolean, default: false },
    explanation_reasoning: { type: String, default: "" },
    other_answers_possible: [{ type: String, default: [] }],
    final_verdict: { type: String, enum: ["Correct", "Incorrect", "Ambiguous"], default: "Ambiguous" },
    validationVersion: { type: Number, default: 0 }
}, { _id: false });

const DuplicateSchema = new mongoose.Schema({
    duplicate_checked_version: { type: Number, default: 0 }, // version control
    duplicate_group_id: { type: String, default: null },     // optional grouping
    duplicate_of: [{ type: mongoose.Schema.Types.ObjectId }], // related question IDs
    reasoning: { type: String, default: "" },                // optional explanation
    confidence: { type: Number, default: null },             // for future AI scoring
    last_checked_at: { type: Date, default: null }           // timestamp
}, { _id: false });


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
    disabled_reason: { type: String, default: "" },

    timesAnsweredCorrectly: { type: Number, default: 0 },
    timesAnsweredIncorrectly: { type: Number, default: 0 },

    difficulty_level: { type: Number, default: 0 },
    difficulty_rationale: { type: String, default: "" },
    difficultyConfirmedVersion: { type: Number, default: 0 },

    validation: { type: ValidationSchema, default: {} },
    needs_validation: { type: Boolean, default: false },
    new_question: { type: Boolean, default: true },
    duplicate: { type: DuplicateSchema, default: {} },

    hash: { type: String, required: true, unique: true },
    version: { type: Number, default: 1, required: true }
});


const CompletionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who completed the quiz
    questionsAttempted: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    incorrectAnswers: { type: Number, required: true },
}, { timestamps: true }); // Auto-adds createdAt & updatedAt timestamps


const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completions: [CompletionSchema],
    questions: [QuestionSchema],
    ratings: [{ type: Number, min: 1, max: 5 }],
    averageRating: { type: Number, default: 0 },

    // Tags like ["geography", "europe", "countries"]
    tags: [{ type: String, index: true }],

    // a higher-level "group" (for quick filtering)
    groups: [{ type: String, index: true }],
});

module.exports = mongoose.model("Category", CategorySchema);
