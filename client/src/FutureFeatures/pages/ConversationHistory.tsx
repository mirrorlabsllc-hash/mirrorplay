import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft,
  MessageCircle,
  Calendar,
  Search,
  Clock,
  Volume2,
  Play,
  Pause,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioBase64?: string;
}

interface Conversation {
  id: string;
  messages: Message[];
  emotionState: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConversationHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [emotionFilter, setEmotionFilter] = useState<string>("all");
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/chat/history"],
  });

  const filteredConversations = conversations.filter((conv) => {
    if (emotionFilter !== "all" && conv.emotionState !== emotionFilter) {
      return false;
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return conv.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const emotionStates = ["all", ...Array.from(new Set(conversations.map((c) => c.emotionState).filter(Boolean)))];

  const playAudio = (audioBase64: string, messageId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingAudio === messageId) {
      setPlayingAudio(null);
      return;
    }

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.onended = () => setPlayingAudio(null);
    audio.onerror = () => setPlayingAudio(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(messageId);
  };

  const getMessagePreview = (messages: Message[]) => {
    if (messages.length === 0) return "No messages";
    const firstUserMsg = messages.find((m) => m.role === "user");
    if (firstUserMsg) {
      return firstUserMsg.content.slice(0, 100) + (firstUserMsg.content.length > 100 ? "..." : "");
    }
    return messages[0].content.slice(0, 100);
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      calm: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      supportive: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      encouraging: "bg-green-500/20 text-green-300 border-green-500/30",
      empathetic: "bg-pink-500/20 text-pink-300 border-pink-500/30",
      focused: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
    return colors[emotion] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-6">
          <Link href="/chat">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Conversation History</h1>
            <p className="text-sm text-muted-foreground">
              Review your past conversations with Mirror AI
            </p>
          </div>
        </div>

        <GlassCard className="p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={emotionFilter} onValueChange={setEmotionFilter}>
              <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-emotion-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {emotionStates.map((emotion) => (
                  <SelectItem key={emotion} value={emotion} data-testid={`option-${emotion}`}>
                    {emotion === "all" ? "All States" : emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-empty-state">
              {searchQuery || emotionFilter !== "all"
                ? "No conversations match your filters"
                : "No conversation history yet. Start chatting with Mirror AI!"}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredConversations.map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Collapsible
                    open={expandedConversation === conv.id}
                    onOpenChange={(open) =>
                      setExpandedConversation(open ? conv.id : null)
                    }
                  >
                    <GlassCard
                      className={cn(
                        "p-4 transition-all",
                        expandedConversation === conv.id && "ring-1 ring-primary/30"
                      )}
                    >
                      <CollapsibleTrigger className="w-full text-left" data-testid={`conversation-${conv.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", getEmotionColor(conv.emotionState))}
                              >
                                {conv.emotionState || "neutral"}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {conv.messages.length} messages
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2" data-testid={`preview-${conv.id}`}>
                              {getMessagePreview(conv.messages)}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(conv.createdAt), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedConversation === conv.id ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-3 max-h-96 overflow-y-auto">
                          {conv.messages.map((msg, msgIndex) => (
                            <div
                              key={msgIndex}
                              className={cn(
                                "flex gap-2",
                                msg.role === "user" ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-lg p-3 text-sm",
                                  msg.role === "user"
                                    ? "bg-primary/20 text-foreground"
                                    : "bg-muted/50 text-foreground"
                                )}
                                data-testid={`message-${conv.id}-${msgIndex}`}
                              >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.audioBase64 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playAudio(msg.audioBase64!, `${conv.id}-${msgIndex}`);
                                    }}
                                    data-testid={`button-play-${conv.id}-${msgIndex}`}
                                  >
                                    {playingAudio === `${conv.id}-${msgIndex}` ? (
                                      <Pause className="w-3 h-3 mr-1" />
                                    ) : (
                                      <Play className="w-3 h-3 mr-1" />
                                    )}
                                    <Volume2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </GlassCard>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
