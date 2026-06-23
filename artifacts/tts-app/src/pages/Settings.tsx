import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Key, LogOut, ArrowLeft, Loader as Loader2, Save, ChartBar as BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, type UserSettings } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalChars, setTotalChars] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const [settingsResult, historyResult] = await Promise.all([
        supabase.from("user_settings").select("*").maybeSingle(),
        supabase.from("tts_history").select("character_count"),
      ]);

      if (settingsResult.data) {
        setApiKey(settingsResult.data.elevenlabs_api_key || "");
      }

      if (historyResult.data) {
        const total = historyResult.data.reduce(
          (sum, item) => sum + item.character_count,
          0
        );
        setTotalChars(total);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user!.id,
        elevenlabs_api_key: apiKey || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save API key.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Saved",
      description: "Your API key has been saved.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/auth");
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your AliSpeaks account</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              ElevenLabs API Key
            </CardTitle>
            <CardDescription>
              Enter your personal ElevenLabs API key to use the TTS features.
              Your key is stored securely and never shared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Key
                    </span>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Your TTS usage and character consumption.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Characters</p>
                <p className="text-2xl font-bold">{totalChars.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Account Email</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
