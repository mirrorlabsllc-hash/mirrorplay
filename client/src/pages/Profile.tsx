import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { 
  Settings, 
  Crown, 
  Award, 
  Mic,
  LogOut,
  ChevronRight,
  Star,
  Sparkles,
  Flame
} from "lucide-react";
import { Link } from "wouter";
import type { UserProgress, Subscription } from "@shared/schema";

export default function Profile() {
  const { user, logout } = useAuth();

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  const tierColors = {
    free: "bg-muted text-muted-foreground",
    peace_plus: "bg-violet-500/20 text-violet-400",
    pro_mind: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  };

  const tierLabels = {
    free: "Free",
    peace_plus: "Mirror Play+",
    pro_mind: "Pro Mind",
  };

  const xpToNextLevel = 100;
  const currentLevelXp = progress ? (progress.totalXp || 0) % xpToNextLevel : 0;
  const levelProgress = (currentLevelXp / xpToNextLevel) * 100;

  const handleLogout = () => {
    logout();
  };

  const isFreeUser = !subscription?.tier || subscription?.tier === "free";
  
  const menuItems = [
    ...(isFreeUser ? [{ icon: Crown, label: "Upgrade to Mirror Play+", href: "/subscribe", description: "Unlock unlimited practice" }] : []),
    { icon: Mic, label: "Voice Settings", href: "/voice", description: "Voice clone & coaching" },
    { icon: Award, label: "Achievements", href: "/progress", description: "View all badges" },
    ...(!isFreeUser ? [{ icon: Crown, label: "Manage Plan", href: "/subscribe", description: "View your plan" }] : []),
    { icon: Settings, label: "Settings", href: "/settings", description: "App preferences" },
  ];

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Profile</h1>
      </motion.div>

      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="relative overflow-visible">
          <div className="flex items-center gap-4">
            <UserAvatar size="lg" />
            
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User"}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge className={tierColors[(subscription?.tier as keyof typeof tierColors) || "free"]}>
                  {tierLabels[(subscription?.tier as keyof typeof tierLabels) || "free"]}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Level {progress?.level || 1}
                </Badge>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="absolute -right-2 -top-2">
            <ProgressRing 
              progress={levelProgress} 
              size={60} 
              strokeWidth={4}
              showPercentage={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{progress?.level || 1}</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard variant="dark" className="text-center py-4">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{progress?.totalXp || 0}</p>
          <p className="text-xs text-muted-foreground">Total XP</p>
        </GlassCard>

        <GlassCard variant="dark" className="text-center py-4">
          <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{progress?.currentStreak || 0}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </GlassCard>

        <GlassCard variant="dark" className="text-center py-4">
          <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold">{progress?.practiceCount || 0}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </GlassCard>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        {menuItems.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <GlassCard 
              variant="dark" 
              hover 
              className="cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button 
          variant="ghost" 
          className="w-full text-destructive hover:text-destructive"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
