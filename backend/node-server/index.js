const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store generated questions per user token
const userQuestions = {
    someUserToken: {
        queue: [],
        current: null
    }
};

module.exports = { userQuestions };

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from "frontend" directory
app.use("/admin", express.static(path.join(__dirname, "frontend-admin")));

const frontendCandidates = [
    path.join(__dirname, "frontend"), // container copy target
    path.join(__dirname, "..", "..", "frontend-react", "dist"), // local dev build output
];

const frontendPath = frontendCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "index.html"))
);
const frontendIndexPath = frontendPath ? path.join(frontendPath, "index.html") : "";
const hasFrontendBuild = Boolean(frontendPath);

if (hasFrontendBuild) {
    app.use(express.static(frontendPath));
} else {
    console.warn(`[frontend] Missing build. Checked: ${frontendCandidates.join(", ")}`);
}

// ==Routes== //

//Users
app.use("/api/users/register", require("./routes/register"));
app.use("/api/users/login", require("./routes/login"));
app.use("/api/users/guestLogin", require("./routes/guestLogin"));
app.use("/api/users", require("./routes/deleteAccount"));
app.use("/api/resetPassword", require("./routes/resetPassword"));
app.use("/api/updatePassword", require("./routes/updatePassword"));
app.use("/api/getUserDetails", require("./routes/getUserDetails"));
app.use("/api/updateUserDetails", require("./routes/updateUserDetails"));
app.use("/api/interests", require("./routes/interestRoutes")); 

//Quiz
app.use("/api/startQuiz", require("./routes/startQuiz")); 
app.use("/api/getGetegoryToPlay", require("./routes/getGetegoryToPlay")); 
app.use("/api/getCategoryToPlay", require("./routes/getGetegoryToPlay")); 

//Categories
app.use("/api/categories", require("./routes/createCategory"));
app.use("/api/categories", require("./routes/getCategories"));
app.use("/api/getUserCategories", require("./routes/getUserCategories"));
app.use("/api/categories", require("./routes/recordCompletion")); 
app.use("/api/categories", require("./routes/rateCategory")); 

//Questions
app.use("/api/nextQuestion", require("./routes/nextQuestion")); 
app.use("/api/answerQuestion", require("./routes/answerQuestion")); 
app.use("/api/updatePopularity", require("./routes/updatePopularity")); 
app.use("/api/reportQuestion", require("./routes/reportQuestion")); 


//Images
app.use("/api/getImageUrl", require("./routes/getImageUrl")); 

//Config
app.use("/api/level-config", require("./routes/getLevelConfig"));


//Sources
app.use("/api/DBpedia", require("./routes/DBpedia")); 

app.use("/api/leaderboard", require("./routes/leaderboard"));
app.use("/api/claimDailyCoins", require("./routes/claimDailyCoins"))
app.use("/api/saga", require("./routes/sagaLevelProgression"));

// Admin APIs
app.use("/api/admin/login", require("./routes/admin/adminLogin"));
app.use("/api/admin/categories", require("./routes/admin/getAllCategories"));
app.use("/api/admin/categories", require("./routes/admin/getCategoryQuestions"));
app.use("/api/admin/duplicates", require("./routes/admin/getDuplicateGroupQuestions"));
app.use("/api/admin/questions", require("./routes/admin/markQuestionAsDuplicate"));
app.use("/api/admin/questions", require("./routes/admin/unmarkDuplicateGroup"));
app.use("/api/admin/questions", require("./routes/admin/updateQuestion"));
app.use("/api/admin/reports", require("./routes/admin/adminReports"));
app.use("/api/admin/questions", require("./routes/admin/getDifficultyStats"));
app.use("/api/admin/questions", require("./routes/admin/getLowSuccessQuestions"));
app.use("/api/admin/questions", require("./routes/admin/deleteQuestionsByVersion"));
app.use("/api/admin/players", require("./routes/admin/getAllPlayers"));
app.use("/api/admin/interests", require("./routes/admin/interests"));

// Protected Route (Requires Authentication)
const authenticateToken = require("./middleware/auth");
app.get("/api/users/protected", authenticateToken, (req, res) => {
    res.json({ message: "Protected route accessed", user: req.user });
});

// SPA fallback for frontend routes
app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "API route not found" });
    }

    if (hasFrontendBuild) {
        return res.sendFile(frontendIndexPath);
    }

    return res.status(503).json({
        message: "Frontend build not found. Run frontend build or copy assets into backend/node-server/frontend.",
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
