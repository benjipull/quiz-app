// Profile.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
// ADDED: Eye/EyeOff for password visibility
import { X, User, LogIn, Lock, Eye, EyeOff } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/utils/apiClient"; 
// Note: We no longer need Dialog/DialogContent/DialogHeader/DialogTitle

const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

// Avatar images are still loaded to display the *current* avatar, 
// but selection logic is removed for guests.
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
  // State for the password input (only used by Guests now)
  const [password, setPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState(""); // NEW: Confirm password
  const [showPassword, setShowPassword] = useState(false); // NEW: Toggle visibility

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
      
      // Determine the initial avatar URL
      const avatarIndex = parsedUser.avatar - 1;
      const initialAvatar = avatars[avatarIndex] || avatars[0] || null;
      setAvatar(initialAvatar);
      
      // Ensure the avatar index is stored for API if a Guest is registering
      if (parsedUser.userType === "Guest" && !localStorage.getItem("userAvatarIndex")) {
        const defaultIndex = 0; // Default to the first avatar for guests
        localStorage.setItem("userAvatar", avatars[defaultIndex]);
        localStorage.setItem("userAvatarIndex", defaultIndex.toString());
      }
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  // Avatar selection is only for registered users
  const handleAvatarSelection = (selectedAvatar: string, index: number) => {
      // Only allow selection if the user is not a guest
      if (userType === "Registered" || userType === "Admin") {
          setAvatar(selectedAvatar);
          localStorage.setItem("userAvatar", selectedAvatar);
          localStorage.setItem("userAvatarIndex", index.toString());
      }
  };

  // ----------------------------------------------------------------
  // CONSOLIDATED updateUserDetails to handle password for Guest
  // ----------------------------------------------------------------
  const updateUserDetails = async (isRegistration: boolean) => {
    setUpdating(true);
    try {
      // 1. Prepare data
      const avatarIndex = localStorage.getItem("userAvatarIndex");
      // Use the stored index + 1 for the API call. 
      const avatarValue = avatarIndex
        ? parseInt(avatarIndex) + 1
        : user.avatar || 1; // Fallback to existing or 1

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        // Include email and password ONLY if it's a Guest completing registration
        ...(isRegistration ? { email: user.email, password } : {}),
      };

      // 2. Send combined request to updateUserDetails endpoint
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");
      
      const response = await fetch(`${BASE_URL}/api/users/updateUserDetails`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response) {
        setUpdating(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
        // 🎯 CRITICAL FIX: SAVE THE NEW TOKEN
        if (data.token) {
            localStorage.setItem("token", data.token); 
        }

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

        if (newType === "Registered" && isRegistration) {
           toast({
             title: "Registration Complete",
             description: "Welcome! Your account is now fully registered.",
           });
           setTimeout(() => navigate("/"), 1500);
        } else {
           toast({
             title: "Success",
             description: "Profile updated successfully!",
           });
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

  // ----------------------------------------------------------------
  // REVISED: Main Form Submission Handler
  // ----------------------------------------------------------------
  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    const isGuest = userType === "Guest";

    // Basic Validation: alias, age
    if (!validateBasicFields(isGuest)) return;

    // Guest Registration Validation (Email, Password, Confirm Password)
    if (isGuest) {
      if (!user.email || !user.email.includes("@")) {
        toast({ title: "Validation Error", description: "Enter a valid email.", variant: "destructive" });
        return;
      }
      if (!password || password.length < 6) {
        toast({ title: "Validation Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
        return;
      }
      // CHECK FOR PASSWORD MATCH IS CRITICAL
      if (password !== confirmPassword) {
        toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
        return;
      }
    }

    // Call updateUserDetails: true for Guest, false for Registered
    await updateUserDetails(isGuest); 
  };
  
  // Basic Field Validation remains the same, adjusted for Guest simplicity
  const validateBasicFields = (isRegistration: boolean) => {
    if (!alias.trim()) {
      toast({ title: "Validation Error", description: "Enter a valid username.", variant: "destructive" });
      return false;
    }
    if (!age || isNaN(parseInt(age)) || parseInt(age) <= 0 || parseInt(age) > 120) {
      toast({ title: "Validation Error", description: "Enter a valid age.", variant: "destructive" });
      return false;
    }
    // Only check for avatar if it's a Registered user editing their profile
    if (!isRegistration && !avatar) {
      toast({ title: "Validation Error", description: "Please select an avatar.", variant: "destructive" });
      return false;
    }
    return true;
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
          aria-label="Close Profile and go to Categories"
          >
          <X className="h-5 w-5 text-white" />
        </Link>

        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <User className="w-5 h-5" />
            <span>
              {isGuest ? "Complete Registration" : "My Profile"}
              {isGuest && (
                <span className="text-sm font-normal text-amber-500">
                  {" "}
                  (Guest)
                </span>
              )}
            </span>
          </CardTitle>
          {isGuest && (
             <p className="text-sm text-muted-foreground">
               Please fill out the fields below to secure and register your account.
             </p>
          )}
        </CardHeader>

        <CardContent>
          {/* Display User's Current Avatar (uses the default for guests) */}
          <div className="flex justify-center mb-6">
            <Avatar className="w-20 h-20 border-4 border-primary shadow-xl">
              <AvatarImage 
                src={avatar || avatars[0]} 
                alt="Current Avatar" 
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                {alias.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <form className="space-y-4" onSubmit={handleSaveClick}>
            
            {/* 1. Username/Alias */}
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

            {/* 2. Email (always shown) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={user.email || ""}
                onChange={(e) =>
                  isGuest ? setUser({ ...user, email: e.target.value }) : null
                }
                placeholder={
                  isGuest ? "Enter your email for registration" : "Your registered email"
                }
                disabled={!isGuest}
                className={`${!isGuest ? "cursor-not-allowed bg-muted" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                Email is required to complete registration.
              </p>
            </div>
            
            {/* 3. Password (ONLY for Guests) */}
            {isGuest && (
              <>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter a strong password (min 6 chars)"
                            required
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* ADDED: Confirm Password Field */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            required
                            className="pr-10"
                        />
                         {/* Reusing the toggle button for confirm password visibility */}
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
              </>
            )}

            {/* 4. Age (always shown) */}
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

            {/* 5. Avatar Selection (ONLY for Registered Users editing profile) */}
            {/* REMOVED for Guest users as requested */}
            {!isGuest && (
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
                <p className="text-xs text-muted-foreground">
                    Guests receive a default avatar upon registration and can change it here later.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={updating}
              className={`w-full ${isGuest ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/80"}`}
            >
              {updating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving...</span>
                </div>
              ) : isGuest ? (
                 <>
                   <LogIn className="w-4 h-4 mr-2" />
                   Complete Registration
                 </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;