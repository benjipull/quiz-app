"use client";

import React, { useEffect, useState } from "react";
import splashImage from "../assets/splash-screen.png";

interface SplashScreenProps {
  dataLoaded: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ dataLoaded }) => {
  const [visible, setVisible] = useState(true);

  // Handle fade-out when data is loaded
  useEffect(() => {
    if (dataLoaded) {
      const timeout = setTimeout(() => setVisible(false), 1000); // match transition duration
      return () => clearTimeout(timeout);
    }
  }, [dataLoaded]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background to-quiz-background transition-opacity duration-700 ${
        dataLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center space-y-8">
        <img
          src={splashImage}
          alt="Splash Screen"
          className="max-w-sm w-full h-auto object-contain animate-pulse"
        />
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-lg font-medium">
            {dataLoaded ? "Almost ready..." : "Loading your quiz experience..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
