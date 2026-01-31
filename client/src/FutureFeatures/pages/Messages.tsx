import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  Send,
  MessageCircle,
  Volume2,
  VolumeX,
  Mic,
  Loader2,
  ArrowLeft,
  Search
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { User, DmConversation, DirectMessage } from "@shared/schema";

interface ConversationWithUser extends DmConversation {
  otherUser: User;
  lastMessage?: DirectMessage;
  unreadCount?: number;
}

interface MessageWithSender extends DirectMessage {
  sender: User;
}

export default function Messages() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<ConversationWithUser[]>({
    queryKey: ["/api/messages/conversations"],
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<MessageWithSender[]>({
    queryKey: [`/api/messages/conversations/${selectedConversation}`],
    enabled: !!selectedConversation,
    refetchInterval: 5000, // Poll for new messages
  });

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ["/api/friends"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/messages/conversations/${data.conversationId}`, { content: data.content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/conversations/${selectedConversation}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/messages/conversations", { participantId: userId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setSelectedConversation(data.id);
    },
    onError: () => {
      toast({ title: "Failed to start conversation", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({ conversationId: selectedConversation, content: newMessage });
  };

  const handlePlayTts = async (messageId: string, text: string) => {
    if (isPlaying === messageId) {
      audioRef.current?.pause();
      setIsPlaying(null);
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/tts", { text });
      const data = await res.json();
      if (data.audioUrl) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(data.audioUrl);
        audioRef.current.onended = () => setIsPlaying(null);
        audioRef.current.play();
        setIsPlaying(messageId);
      }
    } catch {
      toast({ title: "TTS unavailable", variant: "destructive" });
    }
  };

  const selectedConvo = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const name = c.otherUser.firstName || c.otherUser.email || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const availableFriends = friends.filter(f => 
    !conversations.some(c => c.otherUser.id === f.id)
  );

  // Conversation list view
  if (!selectedConversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            <Link href="/community">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Messages</h1>
              <p className="text-sm text-muted-foreground">
                Chat with friends
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-messages"
            />
          </div>

          {/* Start new conversation */}
          {availableFriends.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Start a new conversation</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => startConversationMutation.mutate(friend.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover-elevate min-w-[70px]"
                    data-testid={`button-start-chat-${friend.id}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.profileImageUrl || ""} />
                      <AvatarFallback>
                        {(friend.firstName || friend.email || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate max-w-[60px]">
                      {friend.firstName || friend.email?.split("@")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations list */}
          {loadingConversations ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-messages">
                {searchQuery 
                  ? "No conversations match your search"
                  : "No messages yet. Start a conversation with a friend!"}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((convo) => (
                <GlassCard
                  key={convo.id}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => setSelectedConversation(convo.id)}
                  data-testid={`conversation-${convo.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={convo.otherUser.profileImageUrl || ""} />
                      <AvatarFallback>
                        {(convo.otherUser.firstName || convo.otherUser.email || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {convo.otherUser.firstName 
                            ? `${convo.otherUser.firstName} ${convo.otherUser.lastName || ""}`.trim()
                            : convo.otherUser.email?.split("@")[0]}
                        </p>
                        {(convo.unreadCount || 0) > 0 && (
                          <Badge variant="default" className="text-xs">
                            {convo.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {convo.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {convo.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedConversation(null)}
          data-testid="button-back-to-list"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {selectedConvo && (
          <>
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedConvo.otherUser.profileImageUrl || ""} />
              <AvatarFallback>
                {(selectedConvo.otherUser.firstName || selectedConvo.otherUser.email || "U")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {selectedConvo.otherUser.firstName 
                  ? `${selectedConvo.otherUser.firstName} ${selectedConvo.otherUser.lastName || ""}`.trim()
                  : selectedConvo.otherUser.email?.split("@")[0]}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTtsEnabled(!isTtsEnabled)}
              data-testid="button-toggle-tts"
            >
              {isTtsEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Start the conversation!</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isMe = msg.sender.id !== selectedConvo?.otherUser.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}
                >
                  {!isMe && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={msg.sender.profileImageUrl || ""} />
                      <AvatarFallback>
                        {(msg.sender.firstName || msg.sender.email || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    {isTtsEnabled && !isMe && (
                      <button
                        onClick={() => handlePlayTts(msg.id, msg.content)}
                        className="mt-1 opacity-60 hover:opacity-100"
                        data-testid={`button-play-tts-${msg.id}`}
                      >
                        {isPlaying === msg.id ? (
                          <VolumeX className="w-3 h-3" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
