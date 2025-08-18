import React from 'react';
import { Star, Heart, CoinsIcon } from 'lucide-react'; // Assuming Coins is also from lucide-react or similar
// If Coins is not from lucide-react, you might need to import it differently or use an SVG/emoji.
// For demonstration, I'm assuming 'Coins' exists or using a placeholder if not.

// You might need to install lucide-react if you haven't already: npm install lucide-react

// Placeholder for Coins if it's not directly available in lucide-react
// For a real app, replace with the actual icon or an SVG.
const Coins = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625.75a.75.75 0 0 0-1.5 0v.816A9.624 9.624 0 0 0 6.69 5.86c-1.391 1.235-2.438 2.761-3.033 4.434.332.062.68.102 1.036.126.073.345.166.683.279 1.018a.75.75 0 0 0 .976.456 6.379 6.379 0 0 1-.444-2.656c.552-.162 1.13-.284 1.725-.363a.75.75 0 0 0-.214-1.48C7.59 7.857 7.025 8.077 6.47 8.326A8.136 8.136 0 0 1 4.218 6.02L5.05 5.378a.75.75 0 0 0-.86-1.229l-.5-.35a.75.75 0 0 0-.106-1.11L3.08 2.871A9.753 9.753 0 0 0 2.25 12c0 1.25.132 2.472.383 3.654a.75.75 0 0 0 .991.597c.567-.163 1.157-.278 1.764-.347.073.345.166.683.279 1.018a.75.75 0 0 0 .976.456 6.379 6.379 0 0 1-.444-2.656c.552-.162 1.13-.284 1.725-.363a.75.75 0 0 0-.214-1.48c-.628.162-1.193.382-1.748.631A8.136 8.136 0 0 1 4.218 17.98l.832.642a.75.75 0 0 0 .86 1.229l.5.35c.42.296.64.8.534 1.11l-.868 2.046a.75.75 0 0 0 .106 1.11 9.753 9.753 0 0 0 9.75.002v-.816c-.073-.345-.166-.683-.279-1.018a.75.75 0 0 0-.976-.456 6.379 6.379 0 0 1 .444 2.656c-.552.162-1.13.284-1.725.363a.75.75 0 0 0 .214 1.48c.628-.162 1.193-.382 1.748-.631A8.136 8.136 0 0 1 19.782 17.98l-.832-.642a.75.75 0 0 0-.86-1.229l-.5-.35c-.42-.296-.64-.8-.534-1.11l.868-2.046a.75.75 0 0 0-.106-1.11A9.753 9.753 0 0 0 21.75 12c0-1.25-.132-2.472-.383-3.654a.75.75 0 0 0-.991-.597c-.567.163-1.157.278-1.764.347c-.073-.345-.166-.683-.279-1.018a.75.75 0 0 0-.976-.456 6.379 6.379 0 0 1 .444 2.656c-.552.162-1.13.284-1.725.363a.75.75 0 0 0-.214 1.48c.628-.162 1.193-.382 1.748-.631A8.136 8.136 0 0 1 19.782 6.02l.832-.642a.75.75 0 0 0 .86-1.229l.5-.35c.42-.296.64-.8.534-1.11l-.868-2.046a.75.75 0 0 0-.106-1.11L21.75 12A9.753 9.753 0 0 0 12 2.25Z" clipRule="evenodd" />
  </svg>
);


interface GameStatsHeaderProps {
  userScore?: number; // Made optional as it will be hardcoded
  userCoins?: number; // Made optional as it will be hardcoded
  userLives?: number; // Made optional as it will be hardcoded
}

const GameStatsHeader: React.FC<GameStatsHeaderProps> = () => {
  // Dummy data for demonstration
  const dummyScore = 123;
  const dummyCoins = 4567;
  const dummyLives = 3;

  return (
    <div className="sticky top-10 z-10 bg-gradient-to-br from-background to-quiz-background p-4 shadow-md">
      <div className="pt-4 flex justify-between items-center max-w-4xl mx-auto"> {/* Added max-w-4xl and mx-auto for centering */}
        <div className="flex gap-3">
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <Star className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="font-bold text-foreground">{dummyScore}</span>
          </div>
          <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
            <CoinsIcon className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="font-bold text-foreground">{dummyCoins}</span>
          </div>
        </div>
        <div className="flex items-center bg-card rounded-full px-3 py-2 border border-border/50 shadow-sm">
          <Heart className="h-5 w-5 text-red-500 mr-2" />
          <span className="font-bold text-foreground">{dummyLives}</span>
          <span className="ml-1 text-sm text-muted-foreground">Max</span>
        </div>
      </div>
    </div>
  );
};

export default GameStatsHeader;
