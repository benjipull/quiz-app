import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  correctAnswers: number;
  className?: string;
}

export const QuizProgress = ({
  currentQuestion,
  totalQuestions,
  correctAnswers,
  className,
}: QuizProgressProps) => {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const accuracyPercentage = currentQuestion > 0 ? (correctAnswers / currentQuestion) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          Question {currentQuestion} of {totalQuestions}
        </span>
        <span className="text-muted-foreground">
          {correctAnswers}/{currentQuestion} correct
        </span>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={progressPercentage} 
          className="h-2 bg-muted"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(progressPercentage)}% complete</span>
          {currentQuestion > 0 && (
            <span className={cn(
              "font-medium",
              accuracyPercentage >= 70 ? "text-success" : 
              accuracyPercentage >= 50 ? "text-warning" : "text-destructive"
            )}>
              {Math.round(accuracyPercentage)}% accuracy
            </span>
          )}
        </div>
      </div>
    </div>
  );
};