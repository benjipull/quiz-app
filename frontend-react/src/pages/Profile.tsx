// Profile.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// ⬅️ CRITICAL: Import the apiClient utility
import { apiClient } from "@/utils/apiClient"; 

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
  const [userType, setUserType] = useState<"Guest" | "Registered" | "Admin">(
    "Registered"
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setAlias(parsedUser.alias || "");
      setAge(parsedUser.age || "");
      setUserType(parsedUser.userType || "Registered");
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

  // ----------------------------------------------------------------
  // REVISED updateUserDetails to use apiClient
  // ----------------------------------------------------------------
  const updateUserDetails = async () => {
    setUpdating(true);
    try {
      // Manual token check is no longer needed; apiClient handles it.
      
      const avatarIndex = localStorage.getItem("userAvatarIndex");
      const avatarValue = avatarIndex
        ? parseInt(avatarIndex) + 1
        : (avatars.indexOf(avatar || "") + 1) || user.avatar;

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        ...(userType === "Guest" && user.email ? { email: user.email } : {}),
      };

      // ⬅️ Use apiClient instead of fetch
      const response = await apiClient(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        // apiClient automatically includes the 'Authorization' header
        body: JSON.stringify(updateData),
      });

      // ⬅️ Check if response is undefined (401 handled by apiClient)
      if (!response) {
        setUpdating(false); // Stop loading state as we're exiting/redirecting
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const newType: "Guest" | "Registered" | "Admin" =
          data.user?.userType || "Registered";

        const updatedUser = {
          ...user,
          ...data.user,
          alias,
          age: parseInt(age),
          avatar: avatarValue,
          userType: newType,
        };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUserType(newType);

        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        if (newType === "Registered") {
          toast({
            title: "Registration Complete",
            description: "Welcome! Your email is now verified and locked.",
          });
          setTimeout(() => navigate("/"), 1500);
        }
      } else {
        // Handle other non-200 errors (e.g., 400 Bad Request/Validation)
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

    if (userType === "Guest" && (!user.email || !user.email.includes("@"))) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email to complete registration.",
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

  const isGuest = userType === "Guest";

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg bg-card/90 backdrop-blur-sm border-border/50 shadow-xl relative">
          <Link 
            to={"/"}
            className="absolute top-3 right-3 z-20 h-8 w-8 bg-red-600 hover:bg-red-700 rounded-full transition-colors flex items-center justify-center shadow-lg"
            aria-label="Close Results and go to Categories"
            >
            <X className="h-5 w-5 text-white" />
            </Link>

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
                onChange={(e) =>
                  isGuest ? setUser({ ...user, email: e.target.value }) : null
                }
                placeholder={
                  isGuest ? "Enter your email to complete registration" : ""
                }
                disabled={!isGuest}
                className={`${!isGuest ? "cursor-not-allowed bg-muted" : ""}`}
              />
              {isGuest ? (
                <p className="text-xs text-amber-500">
                  You are currently a <strong>Guest</strong>. Enter your email
                  and click “Save Changes” to complete registration.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed after registration.
                </p>
              )}
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