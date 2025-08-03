import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell, Search, Menu, ArrowLeft } from "lucide-react";

interface HeaderProps {
  title?: string; // Corrected: title is optional
  imageSrc?: string;
  logoAsTitle?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header = ({
  title, // Corrected: removed the default value for title
  imageSrc,
  logoAsTitle = false,
  showMenu = false,
  showSearch = false,
  showNotifications = true,
  showBack = false,
  onBack,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-full items-center justify-between px-4 lg:max-w-4xl lg:px-8 xl:max-w-6xl">
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
            <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-bold text-transparent">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {showSearch && (
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          )}
          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <div className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-primary" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};