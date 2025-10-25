const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // ✅ now mandatory
    },
    reason: {
      type: String,
      enum: [
        "incorrect_answer",
        "ambiguous_wording",
        "duplicate_question",
        "offensive_content",
        "other",
      ],
      required: true,
    },
    otherText: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
