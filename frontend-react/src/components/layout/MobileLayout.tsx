import { Outlet } from "react-router-dom";
import { BottomTabs } from "./BottomTabs";

export const MobileLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      {/* Mobile: max-w-md, Desktop: max-w-2xl with centered layout */}
      <div className="max-w-md lg:max-w-4xl xl:max-w-6xl mx-auto relative px-0 lg:px-4">
        <Outlet />
        <BottomTabs />
      </div>
    </div>
  );
};