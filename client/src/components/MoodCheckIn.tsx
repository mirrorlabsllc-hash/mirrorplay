import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Smile, 
  Sun, 
  Cloud, 
  Frown, 
  Heart, 
  Zap, 
  Moon, 
  Sparkles,
  ChevronDown,
  Check,
  MessageSquare
} from "lucide-react";
import type { MoodCheckIn as MoodCheckInType } from "@shared/schema";

const MOOD_CONFIG = {
  calm: { 
    icon: Cloud, 
    label: "Calm", 
    color: "bg-sky-500/20 dark:bg-sky-400/20", 
    glowColor: "ring-sky-400/50",
    textColor: "text-sky-400"
  },
  happy: { 
    icon: Smile, 
    label: "Happy", 
    color: "bg-yellow-500/20 dark:bg-yellow-400/20", 
    glowColor: "ring-yellow-400/50",
    textColor: "text-yellow-400"
  },
  anxious: { 
    icon: Zap, 
    label: "Anxious", 
    color: "bg-orange-500/20 dark:bg-orange-400/20", 
    glowColor: "ring-orange-400/50",
    textColor: "text-orange-400"
  },
  frustrated: { 
    icon: Frown, 
    label: "Frustrated", 
    color: "bg-red-500/20 dark:bg-red-400/20", 
    glowColor: "ring-red-400/50",
    textColor: "text-red-400"
  },
  sad: { 
    icon: Cloud, 
    label: "Sad", 
    color: "bg-indigo-500/20 dark:bg-indigo-400/20", 
    glowColor: "ring-indigo-400/50",
    textColor: "text-indigo-400"
  },
  energized: { 
    icon: Sun, 
    label: "Energized", 
    color: "bg-amber-500/20 dark:bg-amber-400/20", 
    glowColor: "ring-amber-400/50",
    textColor: "text-amber-400"
  },
  tired: { 
    icon: Moon, 
    label: "Tired", 
    color: "bg-slate-500/20 dark:bg-slate-400/20", 
    glowColor: "ring-slate-400/50",
    textColor: "text-slate-400"
  },
  hopeful: { 
    icon: Sparkles, 
    label: "Hopeful", 
    color: "bg-violet-500/20 dark:bg-violet-400/20", 
    glowColor: "ring-violet-400/50",
    textColor: "text-violet-400"
  },
} as const;

type MoodType = keyof typeof MOOD_CONFIG;

export function MoodCheckIn() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState("");
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const { toast } = useToast();

  const { data: todayCheckIn, isLoading } = useQuery<MoodCheckInType | null>({
    queryKey: ["/api/mood/today"],
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { mood: MoodType; note?: string }) => {
      const response = await apiRequest("POST", "/api/mood/check-in", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/history"] });
      toast({
        title: "Mood recorded",
        description: "Thanks for checking in today!",
      });
      setSelectedMood(null);
      setNote("");
      setIsNoteOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your mood. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMoodSelect = (mood: MoodType) => {
    if (todayCheckIn) return;
    setSelectedMood(mood);
  };

  const handleSubmit = () => {
    if (!selectedMood) return;
    checkInMutation.mutate({ mood: selectedMood, note: note || undefined });
  };

  if (isLoading) {
    return (
      <GlassCard variant="dark" className="animate-pulse">
        <div className="h-24 bg-muted/20 rounded-md" />
      </GlassCard>
    );
  }

  if (todayCheckIn) {
    const moodConfig = MOOD_CONFIG[todayCheckIn.mood as MoodType];
    const MoodIcon = moodConfig?.icon || Heart;
    
    return (
      <GlassCard variant="dark" data-testid="mood-checkin">
        <motion.div 
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            className={`w-12 h-12 rounded-full ${moodConfig?.color} flex items-center justify-center ring-2 ${moodConfig?.glowColor}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <MoodIcon className={`w-6 h-6 ${moodConfig?.textColor}`} />
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Checked in today</span>
            </div>
            <p className="font-medium">Feeling {moodConfig?.label || todayCheckIn.mood}</p>
            {todayCheckIn.note && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{todayCheckIn.note}</p>
            )}
          </div>
        </motion.div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="dark" data-testid="mood-checkin">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <h3 className="font-semibold">How are you feeling?</h3>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence mode="sync">
            {(Object.entries(MOOD_CONFIG) as [MoodType, typeof MOOD_CONFIG[MoodType]][]).map(([mood, config]) => {
              const Icon = config.icon;
              const isSelected = selectedMood === mood;
              
              return (
                <motion.button
                  key={mood}
                  data-testid={`mood-option-${mood}`}
                  onClick={() => handleMoodSelect(mood)}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-xl transition-all
                    ${config.color}
                    ${isSelected ? `ring-2 ${config.glowColor}` : ""}
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (Object.keys(MOOD_CONFIG).indexOf(mood)) * 0.03 }}
                >
                  <Icon className={`w-5 h-5 mb-1 ${config.textColor}`} />
                  <span className="text-[10px] font-medium text-muted-foreground">{config.label}</span>
                  {isSelected && (
                    <motion.div
                      className={`absolute inset-0 rounded-xl ring-2 ${config.glowColor}`}
                      layoutId="mood-selection"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <Collapsible open={isNoteOpen} onOpenChange={setIsNoteOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between text-muted-foreground"
                    data-testid="toggle-note"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Add a quick note
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isNoteOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2"
                  >
                    <Textarea
                      placeholder="What's on your mind? (optional)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="resize-none text-sm min-h-[60px]"
                      data-testid="mood-note-input"
                    />
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>

              <Button 
                onClick={handleSubmit}
                disabled={checkInMutation.isPending}
                className="w-full"
                data-testid="submit-mood"
              >
                {checkInMutation.isPending ? "Saving..." : "Save Check-in"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
