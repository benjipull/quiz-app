import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AddCategory from "./AddCategory";
import Quiz from "./Quiz";
import QuizResults from "./QuizResults";

// UI Components (assuming these are available from your setup, e.g., Shadcn UI)
import { Play, Trophy, Users, Star, Plus, TrendingUp, Clock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// You'll need to create or provide this hero image
import heroImage from "@/assets/quiz-hero.jpg"; // Placeholder, update with your actual path

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [searchParams] = useSearchParams();

    const [quizState, setQuizState] = useState({
        started: false,
        completed: false,
        selectedCategory: null,
        question: null,
        currentQuestionIndex: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        results: null,
        isAnswerSelected: false,
    });

    const [quizLoading, setQuizLoading] = useState(false);
    const userToken = localStorage.getItem("token");
    const navigate = useNavigate();

    const searchQuery = searchParams.get("search") || "";

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setError(null);
        try {
            const response = await fetch("http://localhost:3000/api/categories");
            if (!response.ok) throw new Error(`Failed to fetch categories. Status: ${response.status}`);
            const data = await response.json();

            // Transform API data to match your interface and add new properties
            const transformedCategories = data.map((category, index) => ({
                _id: category._id,
                name: category.name,
                description: category.description || `Test your knowledge in ${category.name}`,
                createdBy: category.createdBy || "QuizMaster",
                completionCount: category.completionsCount || category.completionCount || 0,
                completionsCount: category.completionsCount || category.completionCount || 0,
                questionCount: category.questionCount || 10,
                averageRating: category.averageRating || (3 + Math.random() * 2),
                difficulty: category.difficulty || (index % 3 === 0 ? "Easy" : index % 3 === 1 ? "Medium" : "Hard"),
                image: category.imageUrl || category.image,
                imageUrl: category.imageUrl || category.image,
                trending: (category.completionsCount || category.completionCount || 0) > 50,
                isNew: index < 2 || (new Date().getTime() - new Date(category.createdAt || 0).getTime()) < (7 * 24 * 60 * 60 * 1000)
            }));
            setCategories(transformedCategories);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let currentCategories = categories;

        if (searchQuery) {
            currentCategories = categories.filter(category =>
                category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                category.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        switch (activeTab) {
            case "popular":
                setFilteredCategories([...currentCategories].sort((a, b) => {
                    const aCount = (b.completionCount || b.completionsCount) || 0;
                    const bCount = (a.completionCount || a.completionsCount) || 0;
                    return aCount - bCount;
                }));
                break;
            case "highest-rated":
                setFilteredCategories([...currentCategories].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)));
                break;
            case "new":
                setFilteredCategories(currentCategories.filter(cat => cat.isNew));
                break;
            case "trending":
                setFilteredCategories(currentCategories.filter(cat => cat.trending));
                break;
            default:
                setFilteredCategories(currentCategories);
                break;
        }
    }, [categories, searchQuery, activeTab]);


    const startQuiz = async (categoryId, categoryName) => {
        if (!userToken) {
            alert("❌ You must be logged in to play.");
            return;
        }

        setQuizState({
            started: true,
            completed: false,
            selectedCategory: { id: categoryId, name: categoryName },
            currentQuestionIndex: 0,
            isAnswerSelected: false,
            question: null,
            correctAnswers: 0,
            incorrectAnswers: 0,
            results: null,
        });

        try {
            setQuizLoading(true);
            const response = await fetch("http://localhost:3000/api/startQuiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId, numQuestions: 10, userToken }),
            });

            if (!response.ok) throw new Error("❌ Error starting quiz.");

            fetchNextQuestion();
        } catch (error) {
            setError(error.message);
        } finally {
            setQuizLoading(false);
        }
    };

    const fetchNextQuestion = async () => {
        if (!userToken || quizState.completed) return;

        try {
            setQuizLoading(true);
            const response = await fetch(`http://localhost:3000/api/nextQuestion/${userToken}`);
            const data = await response.json();

            if (response.ok && data.question) {
                setQuizState((prev) => ({
                    ...prev,
                    question: data.question,
                    currentQuestionIndex: prev.currentQuestionIndex + 1,
                    isAnswerSelected: false,
                }));
            } else {
                await recordQuizCompletion();
                setQuizState((prev) => ({
                    ...prev,
                    completed: true,
                    started: false,
                }));
            }
        } catch (error) {
            setError("Error fetching the next question.");
        } finally {
            setQuizLoading(false);
        }
    };

    const handleAnswer = (isCorrect) => {
        setQuizState((prev) => ({
            ...prev,
            correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
            isAnswerSelected: true,
        }));
    };

    const recordQuizCompletion = async () => {
        if (!userToken || !quizState.selectedCategory) return;

        setResultsLoading(true);
        try {
            const { correctAnswers, incorrectAnswers } = quizState;
            const response = await fetch(
                `http://localhost:3000/api/categories/${quizState.selectedCategory.id}/completion`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({
                        questionsAttempted: 10,
                        correctAnswers,
                        incorrectAnswers,
                    }),
                }
            );

            if (response.ok) {
                setQuizState((prev) => ({
                    ...prev,
                    results: {
                        totalQuestions: 10,
                        correctAnswers,
                        incorrectAnswers,
                    },
                }));
                fetchCategories();
            } else {
                console.error("❌ Failed to record completion");
            }
        } catch (error) {
            setError("Error recording quiz completion.");
        } finally {
            setResultsLoading(false);
        }
    };

    const handleBackToCategories = () => {
        setQuizState({
            started: false,
            completed: false,
            selectedCategory: null,
            question: null,
            currentQuestionIndex: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            results: null,
            isAnswerSelected: false,
        });
        navigate("/");
    };

    const updatePopularity = async (questionId, action) => {
        if (!questionId || (action !== 1 && action !== 2)) {
            console.error("❌ Invalid parameters: Ensure questionId is provided and action is 1 (like) or 2 (dislike).");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/updatePopularity", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ questionId, action }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("❌ Failed to update popularity:", errorData.message || errorData);
            } else {
                console.log(`✅ Popularity updated for question ${questionId}`);
            }
        } catch (err) {
            console.error("⚠️ Error updating popularity:", err);
        }
    };

    const resetQuiz = () => {
        setQuizState({
            started: false,
            completed: false,
            selectedCategory: null,
            question: null,
            currentQuestionIndex: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            results: null,
            isAnswerSelected: false,
        });
    };

    const stats = {
        totalQuizzes: categories.reduce((sum, cat) => sum + ((cat.completionCount || cat.completionsCount) || 0), 0),
        totalCategories: categories.length,
        averageRating: categories.length > 0
            ? categories.reduce((sum, cat) => sum + (cat.averageRating || 0), 0) / categories.length
            : 0
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-red-500">Error Loading Categories</h2>
                    <p className="text-gray-400">{error}</p>
                    <button
                        onClick={fetchCategories}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-bg">
            {quizState.started || quizState.completed ? (
                <div className="py-16 px-4 container mx-auto">
                    {quizState.completed ? (
                        resultsLoading ? (
                            <div>Recording results...</div>
                        ) : (
                            <QuizResults results={quizState.results} handleBack={handleBackToCategories} />
                        )
                    ) : (
                        <Quiz
                            question={quizState.question}
                            fetchNextQuestion={fetchNextQuestion}
                            handleAnswer={handleAnswer}
                            currentQuestionIndex={quizState.currentQuestionIndex}
                            loading={quizLoading}
                            isAnswerSelected={quizState.isAnswerSelected}
                            handleBack={handleBackToCategories}
                            resetQuiz={resetQuiz}
                            updatePopularity={updatePopularity}
                            categoryName={quizState.selectedCategory?.name}
                        />
                    )}
                </div>
            ) : (
                <>
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0">
                            <img
                                src={heroImage}
                                alt="Quiz Hero"
                                className="w-full h-full object-cover opacity-20"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/70" />
                        </div>

                        <div className="relative container mx-auto px-4 py-20 md:py-32">
                            <div className="max-w-4xl mx-auto text-center space-y-8">
                                <div className="space-y-4">
                            <Badge className="inline-flex items-center bg-primary/20 text-primary border border-primary/30 px-4 py-2 w-fit">
                            🧠 Challenge Your Mind
                            </Badge>


                                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
                                        <span className="gradient-text">Master Every</span>
                                        <br />
                                        <span className="text-foreground">Quiz Challenge</span>
                                    </h1>

                                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                        Discover thousands of quizzes, test your knowledge, and compete with players worldwide.
                                        Learning has never been this exciting!
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                    <Button
                                        size="lg"
                                        className="btn-primary text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center space-x-2"
                                        onClick={() => {
                                            const categoriesSection = document.getElementById('categories-section');
                                            if (categoriesSection) {
                                                categoriesSection.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                    >
                                        <Play className="w-5 h-5 mr-2" />
                                        <span>Start Playing</span>
                                    </Button>

                                    {!userToken && (
                                        <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-border/50 hover:bg-card/50"
                                            onClick={() => navigate("/register")}
                                        >
                                            <Plus className="w-5 h-5 mr-2" />
                                            <span>Join Free</span>
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                                    <div className="quiz-card text-center animate-slide-up">
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <Users className="w-6 h-6 text-primary" />
                                            <span className="text-2xl font-bold gradient-text">{stats.totalQuizzes.toLocaleString()}</span>
                                        </div>
                                        <p className="text-muted-foreground">Quizzes Completed</p>
                                    </div>

                                    <div className="quiz-card text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <Brain className="w-6 h-6 text-accent" />
                                            <span className="text-2xl font-bold gradient-text">{stats.totalCategories}</span>
                                        </div>
                                        <p className="text-muted-foreground">Categories Available</p>
                                    </div>

                                    <div className="quiz-card text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <Star className="w-6 h-6 text-warning" />
                                            <span className="text-2xl font-bold gradient-text">{stats.averageRating.toFixed(1)}</span>
                                        </div>
                                        <p className="text-muted-foreground">Average Rating</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="categories-section" className="container mx-auto px-4 py-16">
                        <div className="space-y-8">
                            <div className="text-center space-y-4">
                                <h2 className="text-3xl md:text-4xl font-bold gradient-text">
                                    {searchQuery ? `Search Results for "${searchQuery}"` : "Explore Quiz Categories"}
                                
                                </h2>
                                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                    {searchQuery ? `Found ${filteredCategories.length} categories matching your search` : "Choose from our curated collection of quiz categories and start your learning journey"}
                                </p>
                            </div>

                            {userToken && (
                                <div className="mb-8">
                                    <div className="flex items-center justify-between w-full max-w-6xl mx-auto p-4">
                                        <AddCategory />
                                    </div>
                                </div>
                            )}

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-fit mx-auto bg-card/50 backdrop-blur-md border border-border/50 rounded-xl shadow-lg">
                                    <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
                                    <TabsTrigger value="popular" className="flex items-center space-x-1 rounded-lg">
                                        <Users className="w-4 h-4" />
                                        <span className="hidden sm:inline">Popular</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="highest-rated" className="flex items-center space-x-1 rounded-lg">
                                        <Star className="w-4 h-4" />
                                        <span className="hidden sm:inline">Top Rated</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="new" className="flex items-center space-x-1 rounded-lg">
                                        <Clock className="w-4 h-4" />
                                        <span className="hidden sm:inline">New</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="trending" className="flex items-center space-x-1 rounded-lg">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="hidden sm:inline">Trending</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value={activeTab} className="mt-8">
                                    {loading ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className="quiz-card animate-pulse">
                                                    <div className="h-48 bg-muted/20 rounded-xl mb-4" />
                                                    <div className="space-y-3">
                                                        <div className="h-6 bg-muted/20 rounded w-3/4" />
                                                        <div className="h-4 bg-muted/20 rounded w-full" />
                                                        <div className="h-4 bg-muted/20 rounded w-1/2" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {filteredCategories.length > 0 ? (
                                                filteredCategories.map((category, index) => (
                                                    <div
                                                        key={category._id}
                                                        className="animate-bounce-in"
                                                        style={{ animationDelay: `${index * 0.1}s` }}
                                                    >
                                                        <div
                                                            className="quiz-card group cursor-pointer hover:animate-float transition-all duration-500"
                                                            onClick={() => startQuiz(category._id, category.name)}
                                                        >
                                                            <div className="relative overflow-hidden rounded-xl mb-4 h-48 bg-gradient-secondary">
                                                                <img
                                                                    src={category.imageUrl || category.image || `https://picsum.photos/seed/${category._id}/400/300`}
                                                                    alt={category.name}
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                    onError={(e) => {
                                                                        const target = e.target;
                                                                        target.src = `https://picsum.photos/seed/${category._id}/400/300`;
                                                                    }}
                                                                />

                                                                {category.difficulty && (
                                                                    <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-semibold ${
                                                                        category.difficulty === "Easy" ? "bg-green-500 text-white" :
                                                                            category.difficulty === "Medium" ? "bg-yellow-500 text-white" :
                                                                                "bg-red-500 text-white"
                                                                        }`}>
                                                                        {category.difficulty}
                                                                    </div>
                                                                )}

                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100">
                                                                    <button className="btn-primary transform transition-all duration-300 hover:scale-110 shadow-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2">
                                                                        <Play className="w-5 h-5" />
                                                                        <span>Start Quiz</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <h3 className="font-bold text-lg text-foreground line-clamp-1">{category.name}</h3>
                                                                    {category.description && (
                                                                        <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{category.description}</p>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-between text-sm">
                                                                    <div className="flex items-center space-x-4">
                                                                        {(category.completionCount || category.completionsCount || 0) > 0 && (
                                                                            <div className="flex items-center space-x-1 text-muted-foreground">
                                                                                <Users className="w-4 h-4" />
                                                                                <span>{category.completionCount || category.completionsCount}</span>
                                                                            </div>
                                                                        )}

                                                                        {category.averageRating !== undefined && category.averageRating > 0 && (
                                                                            <div className="flex items-center space-x-1 text-muted-foreground">
                                                                                <Star className="w-4 h-4 fill-current text-warning" />
                                                                                <span>{category.averageRating.toFixed(1)}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                                                                        {category.questionCount || 10} questions
                                                                    </div>
                                                                </div>

                                                                {category.createdBy && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Created by <span className="text-foreground font-medium">{category.createdBy}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full text-center text-muted-foreground text-lg py-10">
                                                    No categories found matching your criteria.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <div className="text-center pt-8">
                                <button
                                    className="btn-secondary bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
                                    onClick={() => {
                                        const categoriesSection = document.getElementById('categories-section');
                                        if (categoriesSection) {
                                            categoriesSection.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    <Trophy className="w-5 h-5" />
                                    <span>View All Categories</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="container mx-auto px-4 py-16">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center space-y-4 mb-12">
                                <h2 className="text-3xl md:text-4xl font-bold gradient-text">
                                    Why Choose QuizMaster?
                                </h2>
                                <p className="text-lg text-muted-foreground">
                                    Experience the future of interactive learning
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="quiz-card text-center">
                                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Brain className="w-8 h-8 text-primary-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">AI-Powered Questions</h3>
                                    <p className="text-muted-foreground">
                                        Smart explanations and adaptive difficulty based on your performance
                                    </p>
                                </div>

                                <div className="quiz-card text-center">
                                    <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Trophy className="w-8 h-8 text-background" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Competitive Leaderboards</h3>
                                    <p className="text-muted-foreground">
                                        Compete with players worldwide and track your progress
                                    </p>
                                </div>

                                <div className="quiz-card text-center">
                                    <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-background" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Community Created</h3>
                                    <p className="text-muted-foreground">
                                        Create your own quizzes and share with the community
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Categories;