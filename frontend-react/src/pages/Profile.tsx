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
import { trackEvent } from "@/utils/analytics";
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

interface Interest {
  _id: string;
  name: string;
}

const Profile = () => {
  const [user, setUser] = useState<any | null>(null);
  const [alias, setAlias] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [updating, setUpdating] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false); 
  const [userType, setUserType] = useState<"Guest" | "Registered" | "Admin">("Registered");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch all interests for display
  useEffect(() => {
    const fetchAllInterests = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/interests`);
        if (res.ok) {
          const data = await res.json();
          setAllInterests(data);
        }
      } catch (err) {
        console.error("Failed to fetch interests:", err);
      }
    };
    fetchAllInterests();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setAlias(parsedUser.alias || "");
      setAge(parsedUser.age || "");
      setUserType(parsedUser.userType || "Registered");
      
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
      
      // Track interest update
      trackEvent("update_interests", {
        user_id: user._id,
        interest_count: interestsToSave.length,
      });
      
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
        ...(isRegistration ? { email: user.email, password, interests: selectedInterests } : {}),
      };
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");
      
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

      const newType: "Guest" | "Registered" | "Admin" =
        data.user?.userType || "Registered";

      const updatedUser = {
        ...user,
        ...data.user,
        alias,
        age: parseInt(age),
        avatar: avatarValue,
        userType: newType,
        interests: selectedInterests, 
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUserType(newType);

      if (newType === "Registered" && isRegistration) {
        // Successful Guest registration
        toast({
          title: "Registration Complete",
          description: "Welcome! Your account is now fully registered.",
        });
        setTimeout(() => navigate("/"), 1500); // Redirect to /
      } else if (newType !== "Guest" && !isRegistration) {
        // Successful Registered/Admin update
        toast({
          title: "Success",
          description: "Profile updated successfully! Redirecting to home.",
        });
        setTimeout(() => navigate("/"), 1500); // Redirect to /
      } else {
        // Other updates 
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

  // Get selected interest names for display
  const getSelectedInterestNames = () => {
    return allInterests
      .filter(interest => selectedInterests.includes(interest._id))
      .map(interest => interest.name);
  };

  const handleOpenInterestModal = () => {
    setIsInterestModalOpen(true);
    trackEvent("view_interests", {
      user_id: user?._id,
      context: "profile_page",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  const isGuest = userType === "Guest";
  const selectedInterestNames = getSelectedInterestNames();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl relative">
        <Link 
          to={"/"}
          className="absolute top-3 right-3 z-20 h-9 w-9 bg-red-600 hover:bg-red-700 rounded-full transition-colors flex items-center justify-center shadow-lg transform hover:scale-105"
          aria-label="Close Profile and go to Categories"
        >
          <X className="h-5 w-5 text-white" />
        </Link>

        <CardHeader>
          <CardTitle className="flex items-center space-x-3 text-foreground text-2xl font-bold border-b border-border/30 pb-3">
            <User className="w-6 h-6 text-primary" />
            <span>
              {isGuest ? "Complete Registration" : "My Profile"}
              {isGuest && (
                <span className="text-base font-normal text-amber-500 ml-2">
                  {" "}
                  (Guest)
                </span>
              )}
            </span>
          </CardTitle>
          {isGuest && (
            <p className="text-sm text-muted-foreground pt-2">
              Please fill out the fields below to secure and register your account.
            </p>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex justify-center mb-6">
            <Avatar className="w-24 h-24 border-4 border-primary shadow-xl ring-4 ring-primary/20">
              <AvatarImage 
                src={avatar || avatars[0]} 
                alt="Current Avatar" 
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                {alias.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <form className="space-y-6" onSubmit={handleSaveClick}>
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
                className={`${!isGuest ? "cursor-not-allowed bg-muted/50 border-border/70" : ""}`}
              />
              {isGuest && (
                <p className="text-xs text-muted-foreground">
                  Email is required to complete registration.
                </p>
              )}
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
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
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
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50 transition-colors"
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

            {/* Interest Selection with Tags */}
            <div className="space-y-2">
              <Label>Your Interests</Label>
              
              {/* Display selected interests as tags */}
              {selectedInterestNames.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 min-h-[60px] max-h-32 overflow-y-auto">
                  {selectedInterestNames.map((name, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-600/30 text-purple-200 border border-purple-600/50 shadow-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 min-h-[60px] flex items-center justify-center text-sm text-muted-foreground italic">
                  No interests selected. Click the button to choose some!
                </div>
              )}
              
              {/* Button to open modal */}
              <Button
                type="button"
                variant="blue" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleOpenInterestModal}
                disabled={savingInterests}
              >
                <Heart className="w-4 h-4 mr-2" />
                {savingInterests ? (
                  "Saving Interests..."
                ) : selectedInterests.length > 0
                  ? `Update Interests (${selectedInterests.length} selected)`
                  : "Select Your Interests"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Choose topics you're interested in to personalize your experience.
              </p>
            </div>

            {!isGuest && (
              <div className="space-y-2">
                <Label>Select Avatar</Label>
                <div className="grid grid-cols-5 gap-3 p-3 border border-border rounded-lg bg-card/70">
                  {avatars.map((avatarImg, index) => (
                    <Avatar
                      key={index}
                      className={`w-14 h-14 cursor-pointer border-2 transition-all duration-200 ${
                        avatar === avatarImg
                          ? "border-primary ring-2 ring-primary/50 shadow-xl scale-110"
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
              disabled={updating || savingInterests}
              className={`w-full h-10 transition-colors ${isGuest ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-primary hover:bg-primary/90"}`}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-xl font-bold">
              <Heart className="w-5 h-5 text-primary" />
              <span>Select Your Interests</span>
            </DialogTitle>
            <DialogDescription>
              Choose the topics you're interested in. You can select multiple interests.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 border-y border-border/50">
            {user._id && (
              <InterestSelector
                userId={user._id}
                initialSelectedIds={selectedInterests}
                onSelectionChange={handleInterestChange}
              />
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsInterestModalOpen(false)}
              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              disabled={savingInterests}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveInterests}
              disabled={savingInterests}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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