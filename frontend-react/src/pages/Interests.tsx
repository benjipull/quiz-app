import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import InterestSelector from "@/components/InterestSelector";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { trackEvent } from "@/utils/analytics";
import { getApiBaseUrl } from "@/utils/baseUrl";

const BASE_URL = getApiBaseUrl();

export default function Interests() {
  const { user, loading, updateUserLocally, markUserStale } = useUser();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setSelectedInterests(user.interests || []);
    trackEvent("view_interests", {
      user_id: user._id,
      context: "interests_full_page",
    });
  }, [user]);

  const handleSave = async () => {
    if (!user?._id) return;
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const response = await fetch(`${BASE_URL}/api/interests/user/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: selectedInterests }),
      });

      if (!response.ok) {
        throw new Error("Failed to update interests.");
      }

      updateUserLocally({ interests: selectedInterests });
      markUserStale();

      trackEvent("interests_selected", {
        user_id: user._id,
        interest_count: selectedInterests.length,
        interest_ids: selectedInterests.join(","),
        source: "interests_page",
      });

      sessionStorage.removeItem("interestsSkipped");
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save interests: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("interestsSkipped", "true");
    trackEvent("interests_skipped", {
      user_id: user?._id,
      source: "interests_page",
    });
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] p-4 md:p-8">
      <div className="max-w-3xl mx-auto pt-4 md:pt-8">
        <Card className="bg-card/95 backdrop-blur border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Choose Your Interests
            </CardTitle>
            <CardDescription>
              Select topics to personalize your quiz feed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <InterestSelector
              userId={user._id}
              initialSelectedIds={selectedInterests}
              onSelectionChange={setSelectedInterests}
            />

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={saving}
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || selectedInterests.length === 0}
              >
                {saving ? "Saving..." : `Save Interests (${selectedInterests.length})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
