"use client";

import React, { useEffect, useState } from "react";
import splashImage from "../assets/splash-screen.png";

interface SplashScreenProps {
  dataLoaded: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ dataLoaded }) => {
  const [visible, setVisible] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle fade-out when data is loaded
  useEffect(() => {
    if (dataLoaded) {
      const timeout = setTimeout(() => setVisible(false), 1000); // Slightly faster transition for gaming feel
      return () => clearTimeout(timeout);
    }
  }, [dataLoaded]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-quiz-background to-background transition-opacity duration-500 z-50 ${
        dataLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Gaming-style background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-success to-transparent animate-pulse delay-300"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse delay-500"></div>
      </div>

      <div className="flex flex-col items-center space-y-8 relative z-10">
        <div className="relative">
          <img
            src={splashImage}
            alt="Quiz Game Loading"
            className={`max-w-sm w-full h-auto object-contain transition-all duration-1000 ${
              imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            style={{
              filter: 'drop-shadow(0 0 20px rgba(var(--primary), 0.3))',
              animation: 'float 3s ease-in-out infinite'
            }}
          />
          
          {/* Gaming-style glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-success/20 rounded-full blur-xl animate-pulse"></div>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          {/* Enhanced loading spinner with gaming vibes */}
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-transparent border-t-primary border-r-success"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border-2 border-primary/30"></div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-foreground text-xl font-bold tracking-wide">
              {dataLoaded ? "🎮 Ready to Play!" : "⚡ Powering Up..."}
            </p>
            <p className="text-muted-foreground text-sm font-medium animate-pulse">
              {dataLoaded ? "Starting your quiz experience" : "Loading your gaming experience"}
            </p>
          </div>
          
          {/* Gaming-style progress indicator */}
          <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary to-success transition-all duration-2000 ease-out ${
                dataLoaded ? 'w-full' : 'w-3/4 animate-pulse'
              }`}
              style={{
                boxShadow: '0 0 10px rgba(var(--success), 0.5)'
              }}
            ></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;