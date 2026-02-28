import { Outlet, useLocation } from "react-router-dom";
import { BottomTabs } from "./BottomTabs";

export const MobileLayout = () => {
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-background to-quiz-background">
      
      {/* MAIN CONTENT (scrolls) */}
      <div className="flex-1 max-w-md md:max-w-4xl xl:max-w-6xl mx-auto w-full px-0 md:px-4">
        <Outlet />

        {/* space so content doesn't touch fixed tabs */}
        {!isHomeRoute && <div className="h-16 md:hidden" />}
      </div>

      {/* FIXED BOTTOM TABS */}
      <div className="fixed bottom-0 left-0 right-0">
        <BottomTabs />
      </div>
    </div>
  );
};
