import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import QuizicleLogo from "../assets/images/QuizicleLogo.png";

// List of default avatar image paths — replace with your actual avatar URLs or import paths
const defaultAvatars = [
  "/avatars/1.png",
  "/avatars/2.png",
  "/avatars/3.png",
  "/avatars/4.png",
  "/avatars/5.png",
  // Add more avatars as needed
];

const Header = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const navigate = useNavigate();
  
  // Check if user is logged in - with fallback for cases where localStorage might not be available
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on mount and when localStorage changes
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
      } catch (error) {
        console.warn("localStorage not available:", error);
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
    
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkLoginStatus);
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  // Apply dark or light mode class to <html>
  useEffect(() => {
    try {
      document.documentElement.className = isDark ? "" : "light";
      // Optionally save theme preference
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (error) {
      console.warn("Could not save theme preference:", error);
    }
  }, [isDark]);

  // Load theme preference and avatar on mount
  useEffect(() => {
    try {
      // Load theme preference
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDark(savedTheme === "dark");
      }

      // Load or set avatar
      let storedAvatar = localStorage.getItem("userAvatar");
      if (!storedAvatar) {
        const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
        localStorage.setItem("userAvatar", randomAvatar);
        storedAvatar = randomAvatar;
      }
      setAvatarUrl(storedAvatar);
    } catch (error) {
      console.warn("Could not access localStorage:", error);
      // Set random avatar as fallback
      const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
      setAvatarUrl(randomAvatar);
    }
  }, []);

  // Handle search form submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate('/');
      setSearchTerm("");
      setIsMenuOpen(false);
    }
  };

  // Handle categories scroll
  const handleCategoriesClick = () => {
    const categoriesSection = document.getElementById("categories-section");
    if (categoriesSection) {
      categoriesSection.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('header')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo with image */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={QuizicleLogo}
            alt="Quizicle Logo"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 flex-grow justify-end">
          {/* Search - Better aligned */}
          <form onSubmit={handleSearch} className="relative flex-shrink-0">
            <Search className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search quizzes..."
              className="pl-10 w-64 h-10 input-modern"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {/* Nav Links */}
          <nav className="flex items-center space-x-4">
            <button
              onClick={handleCategoriesClick}
              className="text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Categories
            </button>
            <Link
              to="/leaderboard"
              className="text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap"
            >
              Leaderboard
            </Link>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="hover:bg-card/50 flex-shrink-0"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User controls */}
            {isLoggedIn ? (
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative flex-shrink-0"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                </Button>

                {/* User Avatar */}
                <Link to="/profile">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="p-0 flex-shrink-0"
                    title="Profile"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="User Avatar"
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : (
                      <UsersIcon className="h-6 w-6" />
                    )}
                    {/* Fallback icon */}
                    <UsersIcon 
                      className="h-6 w-6" 
                      style={{ display: avatarUrl ? 'none' : 'block' }}
                    />
                  </Button>
                </Link>

                {/* Users Page */}
                <Link to="/users">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="flex-shrink-0"
                    title="Users"
                  >
                    <UsersIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Link to="/auth">
                  <Button variant="ghost" className="whitespace-nowrap">Login</Button>
                </Link>
                <Link to="/auth">
                  <Button className="btn-primary whitespace-nowrap">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search quizzes..."
                className="pl-10 w-full h-10 input-modern"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            {/* Mobile Navigation */}
            <nav className="flex flex-col space-y-2">
              <button
                onClick={handleCategoriesClick}
                className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors text-left rounded-md"
              >
                Categories
              </button>
              <Link
                to="/leaderboard"
                className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </Link>

              {/* Theme Toggle Mobile */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors text-left rounded-md flex items-center space-x-2"
              >
                {isDark ? (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>

              {isLoggedIn ? (
                <>
                  <Link
                    to="/notifications"
                    className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors rounded-md flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </Link>
                  <Link
                    to="/profile"
                    className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors rounded-md flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="User Avatar"
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <UsersIcon className="h-4 w-4" />
                    )}
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/users"
                    className="p-3 text-foreground/80 hover:text-foreground hover:bg-card/50 transition-colors rounded-md flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UsersIcon className="h-4 w-4" />
                    <span>Users</span>
                  </Link>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start h-12">
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button className="btn-primary w-full h-12">Sign Up</Button>
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