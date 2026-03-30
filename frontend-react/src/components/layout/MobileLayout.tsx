import { Outlet, useLocation } from "react-router-dom";
import { BottomTabs } from "./BottomTabs";

export const MobileLayout = () => {
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";
  const isAboutRoute = location.pathname === "/about-us";
  const isProfileRoute = location.pathname === "/profile";
  const isQuizRoute = location.pathname.startsWith("/quiz");
  const isSagaMapRoute = location.pathname.startsWith("/saga-map");
  const isSagaLevelRoute = location.pathname.startsWith("/saga-level");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-background to-quiz-background">
      
      {/* MAIN CONTENT (scrolls) */}
      <div className="flex-1 max-w-md md:max-w-4xl xl:max-w-6xl mx-auto w-full px-0 md:px-4">
        <Outlet />

        {/* space so content doesn't touch fixed tabs */}
        {!isHomeRoute && !isAboutRoute && !isProfileRoute && !isQuizRoute && !isSagaMapRoute && !isSagaLevelRoute && <div className="h-24 lg:hidden" />}
      </div>

      <BottomTabs />
    </div>
  );
};
