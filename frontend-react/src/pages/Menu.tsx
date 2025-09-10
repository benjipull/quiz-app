"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import GameStatsHeader from "@/components/GameStatsHeader";
import logo from "../assets/images/QuizicleLogo.png";
import {
  User,
  Settings,
  Trophy,
  Users,
  MessageCircle,
  HelpCircle,
  Star,
  Share2,
  Bell,
  Volume2,
  VolumeX,
  Vibrate,
  Globe,
  Shield,
  Clock,
  BarChart3,
  BookOpen,
  Gift,
  CreditCard,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  Mail,
  Phone,
  Bug,
  Heart,
  Info,
  Download,
  Trash2,
  Lock
} from "lucide-react";

const Menu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    vibration: true,
    autoPlay: false,
    dataSaver: false,
    offlineMode: false
  });

  useEffect(() => {
    // Load user data
    const storedUser = localStorage.getItem("user");
    const storedAvatar = localStorage.getItem("userAvatar");
    const storedTheme = localStorage.getItem("theme") || 'light';
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedAvatar) {
      setAvatar(storedAvatar);
    }
    setTheme(storedTheme);

    // Load settings
    const storedSettings = localStorage.getItem("appSettings");
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // Apply theme to document
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("appSettings", JSON.stringify(newSettings));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userAvatar");
    navigate("/login");
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", description: "Update your information", action: () => navigate("/profile") },
        { icon: Trophy, label: "Achievements", description: "View your accomplishments", action: () => navigate("/achievements") },
        { icon: BarChart3, label: "Statistics", description: "Quiz performance & analytics", action: () => navigate("/stats") },
        { icon: Clock, label: "History", description: "Past quiz attempts", action: () => navigate("/history") },
      ]
    },
    {
      title: "Social",
      items: [
        { icon: Users, label: "Friends", description: "Manage your friends list", action: () => navigate("/friends") },
        { icon: MessageCircle, label: "Leaderboard", description: "Global & friends ranking", action: () => navigate("/leaderboard") },
        { icon: Share2, label: "Invite Friends", description: "Share the app with others", action: () => {} },
        { icon: Star, label: "Rate App", description: "Rate us on the app store", action: () => {} },
      ]
    },
    {
      title: "Game Settings",
      items: [
        { 
          icon: theme === 'light' ? Sun : Moon, 
          label: "Theme", 
          description: theme === 'light' ? "Switch to dark mode" : "Switch to light mode",
          action: toggleTheme,
          toggle: true,
          value: theme === 'dark'
        },
        { 
          icon: Bell, 
          label: "Notifications", 
          description: "Push notifications & alerts",
          toggle: true,
          value: settings.notifications,
          action: (value) => updateSetting('notifications', value)
        },
        { 
          icon: settings.sounds ? Volume2 : VolumeX, 
          label: "Sound Effects", 
          description: "Game sounds & music",
          toggle: true,
          value: settings.sounds,
          action: (value) => updateSetting('sounds', value)
        },
        { 
          icon: Vibrate, 
          label: "Haptic Feedback", 
          description: "Vibration on interactions",
          toggle: true,
          value: settings.vibration,
          action: (value) => updateSetting('vibration', value)
        },
      ]
    },
    {
      title: "App Preferences",
      items: [
        { 
          icon: Globe, 
          label: "Auto-play Next Quiz", 
          description: "Automatically start next quiz",
          toggle: true,
          value: settings.autoPlay,
          action: (value) => updateSetting('autoPlay', value)
        },
        { 
          icon: Download, 
          label: "Data Saver Mode", 
          description: "Reduce data usage",
          toggle: true,
          value: settings.dataSaver,
          action: (value) => updateSetting('dataSaver', value)
        },
        { 
          icon: BookOpen, 
          label: "Offline Mode", 
          description: "Download quizzes for offline play",
          toggle: true,
          value: settings.offlineMode,
          action: (value) => updateSetting('offlineMode', value)
        },
      ]
    },
    {
      title: "Premium",
      items: [
        { icon: Gift, label: "Premium Features", description: "Unlock exclusive content", action: () => navigate("/premium") },
        { icon: CreditCard, label: "Purchase History", description: "View your transactions", action: () => navigate("/purchases") },
        { icon: Shield, label: "Restore Purchases", description: "Restore previous purchases", action: () => {} },
      ]
    },
    {
      title: "Support & Info",
      items: [
        { icon: HelpCircle, label: "Help Center", description: "FAQs and tutorials", action: () => navigate("/help") },
        { icon: Mail, label: "Contact Support", description: "Get help from our team", action: () => {} },
        { icon: Bug, label: "Report Bug", description: "Report issues or feedback", action: () => {} },
        { icon: Info, label: "About", description: "App version and info", action: () => navigate("/about") },
        { icon: Lock, label: "Privacy Policy", description: "How we handle your data", action: () => {} },
        { icon: BookOpen, label: "Terms of Service", description: "App usage terms", action: () => {} },
      ]
    },
    {
      title: "Account Management",
      items: [
        { icon: Trash2, label: "Clear Cache", description: "Free up storage space", action: () => {}, destructive: true },
        { icon: Download, label: "Export Data", description: "Download your quiz data", action: () => {} },
        { icon: LogOut, label: "Sign Out", description: "Log out of your account", action: handleLogout, destructive: true },
      ]
    }
  ];

  const alias = user?.alias || user?.name || "Guest";

  const renderMenuItem = (item) => (
    <Card 
      key={item.label} 
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => {
        if (item.toggle && typeof item.action === 'function') {
          item.action(!item.value);
        } else if (item.action) {
          item.action();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${item.destructive ? 'bg-destructive/20' : 'bg-primary/20'}`}>
            <item.icon className={`w-5 h-5 ${item.destructive ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <div className="flex-grow">
            <h3 className={`font-semibold ${item.destructive ? 'text-destructive' : 'text-foreground'}`}>
              {item.label}
            </h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {item.toggle ? (
            <Switch 
              checked={item.value} 
              onCheckedChange={(checked) => item.action(checked)}
              className="data-[state=checked]:bg-primary"
            />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-background">
      <Header logoAsTitle imageSrc={logo} showNotifications />

      <div className="mx-auto max-w-full space-y-4 px-4 pb-4 lg:px-8 lg:pb-8">
        {/* Game Stats Header */}
        <div className="top-0 z-10 bg-gradient-to-br from-background to-quiz-background">
          <GameStatsHeader />
        </div>

        {/* User Profile Section */}
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Link to="/profile" className="no-underline">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatar} alt={alias} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-primary/20 text-xl font-bold text-primary">
                  {alias.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-foreground">{alias}</h2>
              <p className="text-muted-foreground">Tap to view profile</p>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium">Premium</span>
            </div>
          </div>
        </Card>

        {/* Menu Sections */}
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-bold text-foreground mb-3 px-2">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map(renderMenuItem)}
              </div>
            </div>
          ))}
        </div>

        {/* App Version Footer */}
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Quizicle v2.1.0 (Build 2024.09.10)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Made with ❤️ for quiz enthusiasts
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Menu;