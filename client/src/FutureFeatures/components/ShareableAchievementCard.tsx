import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Share2, Download, X, Trophy, Star, Flame, Check, Copy } from "lucide-react";
import html2canvas from "html2canvas";

interface ShareableAchievementCardProps {
  type: "badge" | "milestone" | "stats";
  data: {
    title: string;
    subtitle?: string;
    icon?: string;
    stats?: Array<{ label: string; value: string | number }>;
    date?: string;
    level?: number;
    streak?: number;
    totalXp?: number;
  };
  userName: string;
  onClose?: () => void;
}

export function ShareableAchievementCard({ 
  type, 
  data, 
  userName,
  onClose 
}: ShareableAchievementCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `mirror-play-${type}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyShareText = () => {
    const shareText = type === "badge" 
      ? `I just earned the "${data.title}" badge on Mirror Play! Building my emotional intelligence one practice at a time.`
      : type === "milestone"
      ? `Just hit a milestone on Mirror Play: ${data.title}! ${data.subtitle || ""}`
      : `Level ${data.level} on Mirror Play! ${data.totalXp} XP earned with a ${data.streak}-day streak.`;
    
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mirror Play Achievement",
          text: `Check out my achievement on Mirror Play: ${data.title}`,
          url: window.location.origin,
        });
      } catch (error) {
        handleCopyShareText();
      }
    } else {
      handleCopyShareText();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-12 right-0"
            onClick={onClose}
            data-testid="button-close-share"
          >
            <X className="w-5 h-5" />
          </Button>
        )}

        <div
          ref={cardRef}
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#0a0a0f" }}
        >
          <div className="relative p-6">
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                background: "radial-gradient(circle at 50% 0%, hsl(280 70% 50%) 0%, transparent 70%)",
              }}
            />
            
            <div className="relative z-10 text-center space-y-4">
              <div className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Mirror Play
              </div>

              {type === "badge" && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center border border-violet-500/30">
                    {data.icon ? (
                      <span className="text-4xl">{data.icon}</span>
                    ) : (
                      <Trophy className="w-10 h-10 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{data.title}</h3>
                    {data.subtitle && (
                      <p className="text-sm text-gray-400 mt-1">{data.subtitle}</p>
                    )}
                  </div>
                </>
              )}

              {type === "milestone" && (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center border border-amber-500/30">
                    <Star className="w-10 h-10 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{data.title}</h3>
                    {data.subtitle && (
                      <p className="text-sm text-gray-400 mt-1">{data.subtitle}</p>
                    )}
                  </div>
                </>
              )}

              {type === "stats" && (
                <>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-1">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-lg font-bold text-white">{data.level}</p>
                      <p className="text-[10px] text-gray-400">Level</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/20 flex items-center justify-center mb-1">
                        <Trophy className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-lg font-bold text-white">{data.totalXp}</p>
                      <p className="text-[10px] text-gray-400">XP</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-lg bg-orange-500/20 flex items-center justify-center mb-1">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-lg font-bold text-white">{data.streak}</p>
                      <p className="text-[10px] text-gray-400">Streak</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-2">
                    {userName}'s Progress
                  </h3>
                </>
              )}

              {data.date && (
                <p className="text-xs text-gray-500">{data.date}</p>
              )}

              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-gray-500">
                  Building emotional intelligence
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownload}
            disabled={isGenerating}
            data-testid="button-download-card"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Save Image"}
          </Button>
          <Button
            className="flex-1"
            onClick={handleShare}
            data-testid="button-share-card"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
