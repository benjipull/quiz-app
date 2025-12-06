"use client";

import React, { useEffect, useState } from "react";
import splashImage from "../assets/splash-screen.png";

interface SplashScreenProps {
  dataLoaded: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ dataLoaded }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  console.log("🎨 SplashScreen render - dataLoaded:", dataLoaded, "imageLoaded:", imageLoaded, "fadeOut:", fadeOut);

  // Trigger fade-out when data is loaded
  useEffect(() => {
    if (dataLoaded) {
      console.log("⏰ Data loaded, starting fade out in 100ms");
      // Small delay to ensure smooth transition
      const timeout = setTimeout(() => {
        console.log("🌅 Setting fadeOut to true");
        setFadeOut(true);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [dataLoaded]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: 'radial-gradient(circle at center, #2a0a3b 0%, #180524 55%, #0e0316 100%)'
      }}
    >
      {/* Gaming-style background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" style={{ animationDelay: '300ms' }}></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '500ms' }}></div>
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
              filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))',
              animation: 'float 3s ease-in-out infinite'
            }}
          />
          
          {/* Gaming-style glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-green-500/20 rounded-full blur-xl animate-pulse"></div>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          {/* Enhanced loading spinner with gaming vibes */}
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-transparent border-t-purple-500 border-r-green-500"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border-2 border-purple-500/30"></div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-white text-xl font-bold tracking-wide">
              {dataLoaded ? "🎮 Ready to Play!" : "⚡ Powering Up..."}
            </p>
            <p className="text-gray-400 text-sm font-medium animate-pulse">
              {dataLoaded ? "Starting your quiz experience" : "Loading your gaming experience"}
            </p>
          </div>
          
          {/* Gaming-style progress indicator */}
          <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all ease-out ${
                dataLoaded ? 'w-full' : 'w-3/4 animate-pulse'
              }`}
              style={{
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
                transitionDuration: '2000ms'
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