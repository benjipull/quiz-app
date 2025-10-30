import { NavLink, useLocation } from "react-router-dom";
import { Home, Grid3X3, PlayCircle, User, Trophy, Clock, ShoppingCart, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Grid3X3, label: "Quizzes", path: "/categories" },
  { icon: Home, label: "Home", path: "/" },
  { icon: ShoppingCart, label: "Store", path: "/store" },
  { icon: Menu, label: "Menu", path: "/menu" },
];

export const BottomTabs = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-card/95 to-card/80 backdrop-blur-lg border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-between h-20 px-6 max-w-full mx-auto">
        {tabs.map((tab, index) => {
          const isActive = location.pathname === tab.path;
          const isCenter = index === 2; // Home is in the center
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-300",
                isCenter ? "transform -translate-y-2" : ""
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300 shadow-lg",
                  isCenter
                    ? isActive
                      ? "w-16 h-16 bg-gradient-to-r from-primary to-accent text-primary-foreground scale-110 shadow-xl"
                      : "w-16 h-16 bg-background border-2 border-primary/30 text-primary hover:scale-105 shadow-xl"
                    : isActive
                    ? "w-12 h-12 bg-primary text-primary-foreground"
                    : "w-12 h-12 bg-muted/60 text-muted-foreground hover:bg-primary/20 hover:text-primary hover:scale-105"
                )}
              >
                <tab.icon className={cn(
                  "transition-all duration-300",
                  isCenter ? "h-6 w-6" : "h-5 w-5"
                )} />
              </div>
              
              <span
                className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground",
                  isCenter && isActive ? "font-bold" : ""
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};