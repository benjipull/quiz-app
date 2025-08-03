import { NavLink, useLocation } from "react-router-dom";
import { Home, Grid3X3, PlayCircle, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Grid3X3, label: "Categories", path: "/categories" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomTabs = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative p-2 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary/10 scale-110"
                    : "hover:bg-primary/5 hover:scale-105"
                )}
              >
                <tab.icon className="h-5 w-5" />
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium transition-all duration-300",
                isActive ? "scale-95" : "text-xs"
              )}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};