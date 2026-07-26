import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EDGE_FUNCTION_BASE } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeProfile() {
  const { employee } = useAuth();
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const initials = employee?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!/^\d{6}$/.test(currentPin)) {
      setPinError("Current PIN must be 6 digits");
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      setPinError("New PIN must be 6 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PINs do not match");
      return;
    }
    if (currentPin === newPin) {
      setPinError("New PIN must be different from current PIN");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${EDGE_FUNCTION_BASE}/change-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          employee_id: employee!.id,
          current_pin: currentPin,
          new_pin: newPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("PIN changed successfully!");
        setShowChangePin(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        setPinError(data.error || "Failed to change PIN");
      }
    } catch {
      setPinError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="Profile" description="Your account details">
      <div className="max-w-lg space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{employee?.full_name}</h2>
                <p className="text-sm text-muted-foreground">{employee?.employee_code}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{employee?.full_name}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <p className="text-sm font-medium">{employee?.employee_code}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{(employee as any)?.department?.name || "—"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium capitalize">{employee?.role}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change PIN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change PIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showChangePin ? (
              <Button variant="outline" onClick={() => setShowChangePin(true)}>
                Change PIN
              </Button>
            ) : (
              <form onSubmit={handleChangePin} className="space-y-4">
                {pinError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {pinError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPin">Current PIN</Label>
                  <Input
                    id="currentPin"
                    type="password"
                    placeholder="6-digit PIN"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPin">New PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    placeholder="6-digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm New PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    placeholder="6-digit PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save PIN"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowChangePin(false);
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmPin("");
                      setPinError("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
