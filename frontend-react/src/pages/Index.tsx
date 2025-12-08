const Index = () => {
  return (
<<<<<<< HEAD
    <div className="min-h-screen flex items-center justify-center bg-quiz-background p-6">
      <div className="max-w-lg w-full bg-quiz-card text-card-foreground rounded-xl shadow-card p-8 flex flex-col items-center gap-6">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary">
          Welcome to Quizicle
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground text-center">
          Ready to test your knowledge? Click below to start!
        </p>

        {/* Start Button */}
        <button
          className="w-full py-4 md:py-5 px-6 bg-secondary text-secondary-foreground rounded-full text-xl md:text-2xl font-bold shadow-[0_6px_25px_hsl(var(--secondary)/0.3)] hover:shadow-[0_8px_30px_hsl(var(--secondary)/0.5)] transition-all duration-300"
          onClick={() => alert("Start Quiz")}
        >
          Start Quiz
        </button>

        {/* Quiz Info / Placeholder */}
        <div className="w-full flex justify-between items-center mt-4 text-card-foreground">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-success">0</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wide">
              Coins
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-warning">1</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wide">
              Level
            </span>
          </div>
        </div>
=======
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Quizicle</h1>
>>>>>>> 2b43673ab1ab33b55376fa17425e311778f7108e
      </div>
    </div>
  );
};

export default Index;
