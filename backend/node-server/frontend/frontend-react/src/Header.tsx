import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuizicleLogo from "@/assets/QuizicleLogo.png"; // ✅ Logo Import

const Header = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem("token");

  useEffect(() => {
    document.documentElement.className = isDark ? "" : "light";
  }, [isDark]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo with image */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={QuizicleLogo}
            alt="Quizicle Logo"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search quizzes..."
              className="pl-10 w-64 input-modern"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <nav className="flex items-center space-x-4">
            <button
              onClick={() => {
                const categoriesSection = document.getElementById("categories-section");
                if (categoriesSection) {
                  categoriesSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Categories
            </button>
            <Link to="/leaderboard" className="text-foreground/80 hover:text-foreground transition-colors">
              Leaderboard
            </Link>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="hover:bg-card/50"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                </Button>
                <Link to="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/users">
                  <Button variant="ghost" size="icon">
                    <UsersIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/register">
                  <Button className="btn-primary">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search quizzes..."
                className="pl-10 input-modern"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            <nav className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  const categoriesSection = document.getElementById("categories-section");
                  if (categoriesSection) {
                    categoriesSection.scrollIntoView({ behavior: "smooth" });
                  }
                  setIsMenuOpen(false);
                }}
                className="p-2 text-foreground/80 hover:text-foreground transition-colors text-left"
              >
                Categories
              </button>
              <Link to="/leaderboard" className="p-2 text-foreground/80 hover:text-foreground transition-colors">
                Leaderboard
              </Link>

              {isLoggedIn ? (
                <>
                  <Link to="/notifications" className="p-2 text-foreground/80 hover:text-foreground transition-colors">
                    Notifications
                  </Link>
                  <Link to="/profile" className="p-2 text-foreground/80 hover:text-foreground transition-colors">
                    Profile
                  </Link>
                  <Link to="/users" className="p-2 text-foreground/80 hover:text-foreground transition-colors">
                    Users
                  </Link>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link to="/login">
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="btn-primary w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
