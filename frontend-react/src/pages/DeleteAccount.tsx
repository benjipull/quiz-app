import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { getApiBaseUrl } from "@/utils/baseUrl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BASE_URL = getApiBaseUrl();
const DELETE_CONFIRM_TEXT = "DELETE";

const DeleteAccount = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmationInput.trim().toUpperCase() === DELETE_CONFIRM_TEXT;

  const clearSessionAndRedirect = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userAvatar");
    localStorage.removeItem("userAvatarIndex");
    window.location.href = "/";
  };

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast({
        title: "Session Missing",
        description: "Please log in again before deleting your account.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/users/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete account.");
      }

      toast({
        title: "Account Deleted",
        description: "Your account and associated data have been removed.",
      });

      setTimeout(clearSessionAndRedirect, 400);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] p-4 flex items-center justify-center">
      <Card className="w-full max-w-xl bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader className="space-y-3">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <AlertTriangle className="w-7 h-7 text-red-500" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4">
            <p className="text-sm text-red-100 leading-relaxed">
              This action is permanent. Your account
              {user?.alias ? ` (${user.alias})` : ""}
              , profile data, created categories, category completions, reports, and leaderboard ledger entries will be removed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type <span className="font-bold">{DELETE_CONFIRM_TEXT}</span> to continue
            </Label>
            <Input
              id="delete-confirm"
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              placeholder={DELETE_CONFIRM_TEXT}
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="w-full bg-red-700 hover:bg-red-800 border-red-500"
                disabled={!canDelete || isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting Account..." : "Delete My Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Account Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Are you absolutely sure you want to permanently delete your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    type="button"
                    className="bg-red-700 hover:bg-red-800 border-red-500"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete Account"}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteAccount;
