const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const path = require("path");

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
app.use(express.static(path.join(__dirname, "frontend")));

// ==Routes== //

//Users
app.use("/api/users/register", require("./routes/register"));
app.use("/api/users/login", require("./routes/login"));
app.use("/api/resetPassword", require("./routes/resetPassword"));
app.use("/api/updatePassword", require("./routes/updatePassword"));
app.use("/api/getUserDetails", require("./routes/getUserDetails"));
app.use("/api/updateUserDetails", require("./routes/updateUserDetails"));
app.use("/api/users", require("./routes/users")); 

//Quiz
app.use("/api/startQuiz", require("./routes/startQuiz")); 
app.use("/api/getGetegoryToPlay", require("./routes/getGetegoryToPlay")); 

//Categories
app.use("/api/categories", require("./routes/createCategory"));
app.use("/api/categories", require("./routes/getCategories"));
app.use("/api/categories", require("./routes/recordCompletion")); 
app.use("/api/categories", require("./routes/rateCategory")); 

//Questions
app.use("/api/nextQuestion", require("./routes/nextQuestion")); 
app.use("/api/answerQuestion", require("./routes/answerQuestion")); 
app.use("/api/updatePopularity", require("./routes/updatePopularity")); 

//Images
app.use("/api/getImageUrl", require("./routes/getImageUrl")); 

//Sources
app.use("/api/DBpedia", require("./routes/DBpedia")); 

// Default route (serves index.html for all other routes)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});


// Protected Route (Requires Authentication)
const authenticateToken = require("./middleware/auth");
app.get("/api/users/protected", authenticateToken, (req, res) => {
    res.json({ message: "Protected route accessed", user: req.user });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
