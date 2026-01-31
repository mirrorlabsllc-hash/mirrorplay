import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Trophy, Gift } from "lucide-react";
import { playSound } from "@/lib/sounds";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  size: number;
}

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  rewards?: {
    bonusXp?: number;
    bonusPp?: number;
  };
}

const CONFETTI_COLORS = [
  "hsla(280, 100%, 70%, 0.9)", // purple
  "hsla(320, 100%, 75%, 0.9)", // pink
  "hsla(35, 100%, 65%, 0.9)",  // gold/amber
  "hsla(190, 100%, 70%, 0.9)", // cyan
  "hsla(260, 100%, 75%, 0.9)", // violet
  "hsla(45, 100%, 70%, 0.9)",  // yellow-gold
];

const MILESTONE_LEVELS = [10, 25, 50, 100];

function isMilestoneLevel(level: number): boolean {
  return MILESTONE_LEVELS.includes(level);
}

function getMilestoneRewards(level: number): { bonusXp: number; bonusPp: number } | null {
  if (level === 10) return { bonusXp: 50, bonusPp: 25 };
  if (level === 25) return { bonusXp: 100, bonusPp: 50 };
  if (level === 50) return { bonusXp: 200, bonusPp: 100 };
  if (level === 100) return { bonusXp: 500, bonusPp: 250 };
  return null;
}

function ConfettiAnimation({ 
  count = 40, 
  duration = 3500,
  isMilestone = false 
}: { 
  count?: number; 
  duration?: number;
  isMilestone?: boolean;
}) {
  const pieces = useMemo(() => {
    const actualCount = isMilestone ? count * 1.5 : count;
    const actualDuration = isMilestone ? duration * 1.3 : duration;
    
    return Array.from({ length: actualCount }, (_, i): ConfettiPiece => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: (actualDuration + Math.random() * 1000) / 1000,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 720 - 360,
      size: Math.random() * 8 + 4,
    }));
  }, [count, duration, isMilestone]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: -20,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
          initial={{ 
            y: -20, 
            opacity: 1, 
            rotate: 0,
            scale: 0 
          }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [1, 1, 0],
            rotate: piece.rotation,
            scale: [0, 1, 1, 0.5],
            x: [0, (Math.random() - 0.5) * 100],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function SparkleAnimation() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${15 + Math.random() * 70}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
        </motion.div>
      ))}
    </div>
  );
}

export function LevelUpModal({ isOpen, onClose, newLevel, rewards }: LevelUpModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const isMilestone = isMilestoneLevel(newLevel);
  const milestoneRewards = getMilestoneRewards(newLevel);
  
  const displayRewards = rewards || milestoneRewards;

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      playSound("levelUp");
      const timeout = setTimeout(() => {
        setShowConfetti(false);
      }, isMilestone ? 5000 : 4000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isMilestone]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="glass-dark border-none max-w-sm mx-auto overflow-visible"
        data-testid="modal-level-up"
      >
        <DialogTitle className="sr-only">Level Up Celebration</DialogTitle>
        
        {showConfetti && (
          <ConfettiAnimation 
            count={isMilestone ? 60 : 40} 
            duration={isMilestone ? 4500 : 3500}
            isMilestone={isMilestone}
          />
        )}
        
        <SparkleAnimation />
        
        <div className="flex flex-col items-center text-center py-4 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.1 
            }}
            className="mb-4"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isMilestone 
                ? "bg-gradient-to-br from-amber-500 to-orange-600 glow-amber" 
                : "bg-gradient-to-br from-violet-500 to-purple-600 glow-purple"
            }`}>
              {isMilestone ? (
                <Trophy className="w-10 h-10 text-white" />
              ) : (
                <Star className="w-10 h-10 text-white" />
              )}
            </div>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-2xl font-bold mb-2 ${
              isMilestone ? "text-glow-amber" : "text-glow-purple"
            }`}
          >
            {isMilestone ? "Milestone Achieved!" : "Level Up!"}
          </motion.h2>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 150, 
              damping: 12,
              delay: 0.3 
            }}
            className="mb-4"
          >
            <span className={`text-7xl font-black ${
              isMilestone 
                ? "text-glow-amber text-amber-400" 
                : "text-glow-purple text-primary"
            }`}>
              {newLevel}
            </span>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-6"
          >
            {isMilestone 
              ? `You've reached an incredible milestone!`
              : `You've reached level ${newLevel}!`
            }
          </motion.p>
          
          {displayRewards && (displayRewards.bonusXp || displayRewards.bonusPp) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full glass-dark rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-primary" />
                <span className="font-semibold">Bonus Rewards</span>
              </div>
              <div className="flex items-center justify-center gap-6">
                {displayRewards.bonusXp && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-lg font-bold text-primary">+{displayRewards.bonusXp} XP</span>
                  </div>
                )}
                {displayRewards.bonusPp && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-lg font-bold text-amber-500">+{displayRewards.bonusPp} PP</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <Button 
              onClick={onClose}
              className="w-full"
              size="lg"
              data-testid="button-continue-level-up"
            >
              Continue
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const LEVEL_STORAGE_KEY = "mirror_play_last_seen_level";

export function useLevelUpDetection(currentLevel: number | undefined) {
  const [showModal, setShowModal] = useState(false);
  const [leveledUpTo, setLeveledUpTo] = useState<number>(1);

  useEffect(() => {
    if (currentLevel === undefined || currentLevel < 1) return;

    const storedLevel = localStorage.getItem(LEVEL_STORAGE_KEY);
    const lastSeenLevel = storedLevel ? parseInt(storedLevel, 10) : currentLevel;

    if (currentLevel > lastSeenLevel) {
      setLeveledUpTo(currentLevel);
      setShowModal(true);
      localStorage.setItem(LEVEL_STORAGE_KEY, String(currentLevel));
    } else if (!storedLevel) {
      localStorage.setItem(LEVEL_STORAGE_KEY, String(currentLevel));
    }
  }, [currentLevel]);

  const handleClose = () => {
    setShowModal(false);
  };

  return {
    showModal,
    leveledUpTo,
    handleClose,
  };
}
