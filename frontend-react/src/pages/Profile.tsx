// Profile.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

const avatarImages = import.meta.glob("../assets/images/avatars/*.png", {
  eager: true,
  import: "default",
});
const avatars = Object.values(avatarImages) as string[];

const Profile = () => {
  const [user, setUser] = useState<any | null>(null);
  const [alias, setAlias] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setAlias(parsedUser.alias || "");
      setAge(parsedUser.age || "");
      setIsGuest(parsedUser.playerType === "Guest");
      setAvatar(
        localStorage.getItem("userAvatar") ||
          avatars[parsedUser.avatar - 1] ||
          null
      );
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  const handleAvatarSelection = (selectedAvatar: string, index: number) => {
    setAvatar(selectedAvatar);
    localStorage.setItem("userAvatar", selectedAvatar);
    localStorage.setItem("userAvatarIndex", index.toString());
  };

  const updateUserDetails = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const avatarIndex = localStorage.getItem("userAvatarIndex");
      const avatarValue = avatarIndex
        ? parseInt(avatarIndex) + 1
        : (avatars.indexOf(avatar || "") + 1) || user.avatar;

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        email: user.email, // ✅ Always send updated email
      };

      const response = await fetch(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const data = await response.json();
        const newPlayerType =
          data.user?.playerType || user.playerType || "Normal";

        const updatedUser = {
          ...user,
          ...data.user,
          alias,
          age: parseInt(age),
          avatar: avatarValue,
          playerType: newPlayerType,
          email: user.email,
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setIsGuest(newPlayerType === "Guest");

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        if (newPlayerType === "Normal") {
          toast({
            title: "Registration Complete",
            description:
              "Welcome! Your progress will now be saved permanently.",
          });
          setTimeout(() => navigate("/"), 1500);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile.");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save changes: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!alias.trim()) {
      toast({
        title: "Validation Error",
        description: "Enter a valid username.",
        variant: "destructive",
      });
      return;
    }

    if (
      !age ||
      isNaN(parseInt(age)) ||
      parseInt(age) <= 0 ||
      parseInt(age) > 120
    ) {
      toast({
        title: "Validation Error",
        description: "Enter a valid age.",
        variant: "destructive",
      });
      return;
    }

    if (!avatar) {
      toast({
        title: "Validation Error",
        description: "Please select an avatar.",
        variant: "destructive",
      });
      return;
    }

    if (!user.email || !user.email.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    await updateUserDetails();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg bg-card/90 backdrop-blur-sm border-border/50 shadow-xl relative">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <X className="w-5 h-5" />
        </Button>

        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <User className="w-5 h-5" />
            <span>
              My Profile{" "}
              {isGuest && (
                <span className="text-sm font-normal text-amber-500">
                  (Guest)
                </span>
              )}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSaveClick}>
            <div className="space-y-2">
              <Label htmlFor="alias">Username</Label>
              <Input
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={user.email || ""}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                placeholder="Enter your email address"
                required
              />
              <p className="text-xs text-muted-foreground">
                You can update your email anytime.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="1"
                max="120"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Select Avatar</Label>
              <div className="grid grid-cols-4 gap-2 p-3 border border-border rounded-lg bg-card">
                {avatars.map((avatarImg, index) => (
                  <Avatar
                    key={index}
                    className={`w-16 h-16 cursor-pointer border-2 transition-all ${
                      avatar === avatarImg
                        ? "border-primary ring-2 ring-primary/30 shadow-lg scale-110"
                        : "border-transparent hover:border-primary/50 hover:scale-105"
                    }`}
                    onClick={() => handleAvatarSelection(avatarImg, index)}
                  >
                    <AvatarImage src={avatarImg} alt={`Avatar ${index + 1}`} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      AV
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={updating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {updating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>

          {isGuest && (
            <div className="pt-4 border-t border-border/50 mt-4">
              <Button
                type="button"
                onClick={() => navigate("/auth")}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Complete Registration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
