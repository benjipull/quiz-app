import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Bell,
  Search,
  Menu,
  ArrowLeft,
  Home,
  Grid3X3,
  Trophy,
  User,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const navTabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Grid3X3, label: "Categories", path: "/categories" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface HeaderProps {
  title?: string;
  imageSrc?: string;
  logoAsTitle?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header = ({
  title,
  imageSrc,
  logoAsTitle = false,
  showMenu = false,
  showSearch = false,
  showNotifications = true,
  showBack = false,
  onBack,
}: HeaderProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8 max-w-full lg:max-w-4xl xl:max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {showMenu && (
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {logoAsTitle && imageSrc ? (
            <img
              src={imageSrc}
              alt="Logo"
              className="h-8 w-auto max-w-[120px]"
            />
          ) : (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Navigation Tabs */}
          {!isMobile && (
            <div className="flex items-center gap-1 mr-4">
              {navTabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          <ThemeToggle />

          {showSearch && (
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          )}

          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
