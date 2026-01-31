import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Mic,
  Type,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useOnboardingTour } from "@/components/OnboardingTour";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserProgress } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { resetTour } = useOnboardingTour();

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { textInputEnabled: boolean }) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({ title: "Settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const textInputEnabled = progress?.textInputEnabled || false;

  const handleTextInputToggle = (enabled: boolean) => {
    updateSettingsMutation.mutate({ textInputEnabled: enabled });
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="settings-page">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link to="/profile">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          Input Preferences
        </h2>
        
        <GlassCard variant="dark">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <Label className="text-base font-medium">Voice Input</Label>
                  <p className="text-sm text-muted-foreground">Primary input method</p>
                </div>
              </div>
              <Switch checked={true} disabled />
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                    <Type className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Text Input</Label>
                    <p className="text-sm text-muted-foreground">Accessibility option</p>
                  </div>
                </div>
                <Switch 
                  checked={textInputEnabled}
                  onCheckedChange={handleTextInputToggle}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="text-input-toggle"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {!textInputEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard variant="dark" className="border-amber-500/30">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Voice is recommended</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mirror Play is designed for voice-first interaction. Text input is available 
                    as an accessibility option for users who need it.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="font-semibold text-lg">General</h2>
        
        <GlassCard variant="dark">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <Label>Sound Effects</Label>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <Label>Notifications</Label>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center gap-3 mb-3">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-violet-400" />
                ) : theme === "light" ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                )}
                <Label>Theme</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1"
                  data-testid="button-theme-light"
                >
                  <Sun className="w-4 h-4 mr-1" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-4 h-4 mr-1" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex-1"
                  data-testid="button-theme-system"
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  Auto
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h2 className="font-semibold text-lg">Support</h2>
        
        <GlassCard 
          variant="dark" 
          className="hover-elevate cursor-pointer"
          onClick={() => {
            resetTour();
            toast({ title: "Tour restarted! Taking you through the app..." });
          }}
          data-testid="button-restart-tour"
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-primary" />
            <div>
              <span className="font-medium">Restart App Tour</span>
              <p className="text-xs text-muted-foreground">Take a guided tour of Mirror Play's features</p>
            </div>
          </div>
        </GlassCard>
        
        <Link to="/help">
          <GlassCard variant="dark" className="hover-elevate">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span>Help & FAQ</span>
            </div>
          </GlassCard>
        </Link>
        
        <Link to="/privacy">
          <GlassCard variant="dark" className="hover-elevate">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span>Privacy Policy</span>
            </div>
          </GlassCard>
        </Link>
      </motion.div>
    </div>
  );
}
