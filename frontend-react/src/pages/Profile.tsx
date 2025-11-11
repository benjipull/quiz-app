// Profile.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, User, LogIn, Eye, EyeOff, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import InterestSelector from "@/components/InterestSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BASE_URL = import.meta.env.VITE_BASE_URL;

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  // New state for interest-specific saving
  const [savingInterests, setSavingInterests] = useState(false); 
  const [userType, setUserType] = useState<"Guest" | "Registered" | "Admin">(
    "Registered"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);

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
      
      // Set initial interests
      setSelectedInterests(parsedUser.interests || []);
      
      const avatarIndex = parsedUser.avatar - 1;
      const initialAvatar = avatars[avatarIndex] || avatars[0] || null;
      setAvatar(initialAvatar);
      
      if (parsedUser.userType === "Guest" && !localStorage.getItem("userAvatarIndex")) {
        const defaultIndex = 0;
        localStorage.setItem("userAvatar", avatars[defaultIndex]);
        localStorage.setItem("userAvatarIndex", defaultIndex.toString());
      }
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  const handleAvatarSelection = (selectedAvatar: string, index: number) => {
    if (userType === "Registered" || userType === "Admin") {
      setAvatar(selectedAvatar);
      localStorage.setItem("userAvatar", selectedAvatar);
      localStorage.setItem("userAvatarIndex", index.toString());
    }
  };

  const handleInterestChange = (newSelectedIds: string[]) => {
    setSelectedInterests(newSelectedIds);
  };

  // NEW FUNCTION: Save interests directly from the modal
  const saveInterestsToBackend = async (interestsToSave: string[]) => {
    if (!user?._id) return;
    setSavingInterests(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const interestsResponse = await fetch(
        `${BASE_URL}/api/interests/user/${user._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ interests: interestsToSave }),
        }
      );

      if (!interestsResponse.ok) {
        throw new Error("Failed to update interests.");
      }

      const updatedUser = {
        ...user,
        interests: interestsToSave,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      toast({
        title: "Success",
        description: `Interests updated successfully! (${interestsToSave.length} selected)`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save interests: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setSavingInterests(false);
    }
  };


  const handleSaveInterests = async () => {
    await saveInterestsToBackend(selectedInterests);
    setIsInterestModalOpen(false);
  };

  // Modified updateUserDetails to remove the separate interest API call
  const updateUserDetails = async (isRegistration: boolean) => {
    setUpdating(true);
    try {
      const avatarIndex = localStorage.getItem("userAvatarIndex");
      const avatarValue = avatarIndex
        ? parseInt(avatarIndex) + 1
        : user.avatar || 1;

      const updateData = {
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        // Interests are NOT sent here anymore, as they were saved previously
        ...(isRegistration ? { email: user.email, password, interests: selectedInterests } : {}),
      };
      
      // If it's registration, interests are sent with the registration payload.
      // If it's just an update, interests are assumed to be saved by the modal function.
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");
      
      // Update basic user details
      const response = await fetch(`${BASE_URL}/api/updateUserDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile.");
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      
      // The separate interestsResponse PUT call is REMOVED from here

      const newType: "Guest" | "Registered" | "Admin" =
        data.user?.userType || "Registered";

      const updatedUser = {
        ...user,
        ...data.user,
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        userType: newType,
        // Retain local interests state
        interests: selectedInterests, 
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
    const isGuest = userType === "Guest";

    if (!validateBasicFields(isGuest)) return;

    if (isGuest) {
      if (!user.email || !user.email.includes("@")) {
        toast({ title: "Validation Error", description: "Enter a valid email.", variant: "destructive" });
        return;
      }
      if (!password || password.length < 6) {
        toast({ title: "Validation Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
        return;
      }
    }
    
    // IMPORTANT: For registered users, interests should already be saved by the modal.
    // For guests, interests are sent with the registration payload in updateUserDetails.
    
    await updateUserDetails(isGuest);
  };
  
  const validateBasicFields = (isRegistration: boolean) => {
    if (!alias.trim()) {
      toast({ title: "Validation Error", description: "Enter a valid username.", variant: "destructive" });
      return false;
    }
    if (!age || isNaN(parseInt(age)) || parseInt(age) <= 0 || parseInt(age) > 120) {
      toast({ title: "Validation Error", description: "Enter a valid age.", variant: "destructive" });
      return false;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] p-4 flex items-center justify-center">
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
                  isGuest ? "Enter your email for registration" : "Your registered email"
                }
                disabled={!isGuest}
                className={`${!isGuest ? "cursor-not-allowed bg-muted" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                Email is required to complete registration.
              </p>
            </div>
            
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

            {/* Interest Selection Button */}
            <div className="space-y-2">
              <Label>Your Interests</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsInterestModalOpen(true)}
                disabled={savingInterests} // Disable if interests are currently saving
              >
                <Heart className="w-4 h-4 mr-2" />
                {savingInterests ? (
                  "Saving Interests..."
                ) : selectedInterests.length > 0
                  ? `${selectedInterests.length} interest(s) selected`
                  : "Select Your Interests"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Choose topics you're interested in to personalize your experience.
              </p>
            </div>

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
              disabled={updating || savingInterests} // Disable if saving profile or interests
              className={`w-full ${isGuest ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/80"}`}
            >
              {updating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving Profile...</span>
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

      {/* Interest Selection Modal */}
      <Dialog open={isInterestModalOpen} onOpenChange={setIsInterestModalOpen}>
        <DialogContent className="max-w-2xl max-h-[100vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>Select Your Interests</span>
            </DialogTitle>
            <DialogDescription>
              Choose the topics you're interested in. You can select multiple interests.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {user._id && (
              <InterestSelector
                userId={user._id}
                initialSelectedIds={selectedInterests}
                onSelectionChange={handleInterestChange}
              />
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsInterestModalOpen(false)}
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              disabled={savingInterests}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveInterests}
              disabled={savingInterests}
            >
              {savingInterests ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Saving...</span>
                </div>
              ) : (
                `Save Interests (${selectedInterests.length})`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;