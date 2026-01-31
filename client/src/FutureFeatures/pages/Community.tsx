import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Heart, PartyPopper, Handshake, Sparkles, MessageCircle, Plus, Loader2, Trash2, Send, Trophy, Target, Lightbulb, MessageSquareHeart, Users, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User, CommunityPost, PostComment, CosmeticItem, UserProgress } from "@shared/schema";

interface FeedItem {
  post: CommunityPost;
  user: User;
  reactionCounts: Record<string, number>;
  commentCount: number;
  userReaction?: string;
}

interface CommentItem {
  comment: PostComment;
  user: User;
}

const POST_TYPE_CONFIG = {
  achievement: { label: "Achievement", icon: Trophy, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  milestone: { label: "Milestone", icon: Target, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  tip: { label: "Tip", icon: Lightbulb, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  encouragement: { label: "Encouragement", icon: MessageSquareHeart, color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  practice_share: { label: "Practice Share", icon: Users, color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const REACTION_CONFIG = {
  heart: { icon: Heart, label: "Heart", activeColor: "text-red-400" },
  celebrate: { icon: PartyPopper, label: "Celebrate", activeColor: "text-amber-400" },
  support: { icon: Handshake, label: "Support", activeColor: "text-blue-400" },
  inspire: { icon: Sparkles, label: "Inspire", activeColor: "text-purple-400" },
};

function GiftDialog({ toUser, open, onOpenChange }: { toUser: User; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [buyAndGift, setBuyAndGift] = useState(false);
  const { toast } = useToast();

  const { data: inventory } = useQuery<{ item: CosmeticItem }[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: shopItems } = useQuery<CosmeticItem[]>({
    queryKey: ["/api/shop"],
  });

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const sendGift = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gifts/send-to-user", {
        toUserId: toUser.id,
        itemId: selectedItemId,
        message: message || undefined,
        buyAndGift,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({ title: "Gift sent!", description: `Your gift is on its way to ${toUser.firstName || "them"}` });
      onOpenChange(false);
      setSelectedItemId("");
      setMessage("");
      setBuyAndGift(false);
    },
    onError: () => {
      toast({ title: "Failed to send gift", variant: "destructive" });
    },
  });

  const ownedItems = inventory?.map(i => i.item) || [];
  const availableShopItems = shopItems?.filter(i => !ownedItems.some(o => o.id === i.id)) || [];
  const displayItems = buyAndGift ? availableShopItems : ownedItems;
  const selectedItem = displayItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-dark border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-400" />
            Send a Gift to {toUser.firstName || "this user"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Button
              variant={buyAndGift ? "outline" : "default"}
              size="sm"
              onClick={() => { setBuyAndGift(false); setSelectedItemId(""); }}
              data-testid="button-from-inventory"
            >
              From Inventory
            </Button>
            <Button
              variant={buyAndGift ? "default" : "outline"}
              size="sm"
              onClick={() => { setBuyAndGift(true); setSelectedItemId(""); }}
              data-testid="button-buy-and-gift"
            >
              Buy & Gift
            </Button>
          </div>

          {buyAndGift && progress && (
            <p className="text-sm text-muted-foreground">
              Your Peace Points: <span className="text-primary font-medium">{progress.totalPp || 0} PP</span>
            </p>
          )}

          {displayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {buyAndGift ? "No items available in the shop" : "No items in your inventory to gift"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border ${
                    selectedItemId === item.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30"
                  }`}
                  data-testid={`gift-item-${item.id}`}
                >
                  <div className="w-full aspect-square rounded bg-muted flex items-center justify-center mb-1">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs truncate text-foreground">{item.name}</p>
                  {buyAndGift && (
                    <p className="text-xs text-primary">{item.price} PP</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <Textarea
            placeholder="Add a personal message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[60px] resize-none"
            data-testid="input-gift-message"
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendGift.mutate()}
              disabled={!selectedItemId || sendGift.isPending || (buyAndGift && selectedItem && (progress?.totalPp || 0) < selectedItem.price)}
              data-testid="button-send-gift"
            >
              {sendGift.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Send Gift
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostCard({ item, onReactionChange }: { item: FeedItem; onReactionChange: (postId: string, reactionCounts: Record<string, number>, userReaction?: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const { toast } = useToast();

  const typeConfig = POST_TYPE_CONFIG[item.post.type as keyof typeof POST_TYPE_CONFIG] || POST_TYPE_CONFIG.tip;
  const TypeIcon = typeConfig.icon;

  const { data: comments = [], isLoading: loadingComments, refetch: refetchComments } = useQuery<CommentItem[]>({
    queryKey: ['/api/community/posts', item.post.id, 'comments'],
    enabled: showComments,
  });

  const addReaction = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", `/api/community/posts/${item.post.id}/reactions`, { type });
      return res.json();
    },
    onSuccess: (data) => {
      onReactionChange(item.post.id, data.reactionCounts, data.userReaction);
    },
  });

  const removeReaction = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/community/posts/${item.post.id}/reactions`);
      return res.json();
    },
    onSuccess: (data) => {
      onReactionChange(item.post.id, data.reactionCounts, undefined);
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/community/posts/${item.post.id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['/api/community/feed'] });
      toast({ title: "Comment added" });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/community/posts/${item.post.id}/comments/${commentId}`);
    },
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['/api/community/feed'] });
      toast({ title: "Comment deleted" });
    },
  });

  const handleReactionClick = (type: string) => {
    if (item.userReaction === type) {
      removeReaction.mutate();
    } else {
      addReaction.mutate(type);
    }
  };

  return (
    <GlassCard variant="dark" className="p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={item.user.profileImageUrl || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {(item.user.firstName?.[0] || item.user.email?.[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium text-foreground" data-testid={`text-username-${item.post.id}`}>
              {item.user.firstName || item.user.email?.split("@")[0] || "User"}
            </span>
            <Badge variant="outline" className={`text-xs ${typeConfig.color}`} data-testid={`badge-type-${item.post.id}`}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.post.createdAt!), { addSuffix: true })}
            </span>
          </div>
          <p className="text-foreground whitespace-pre-wrap break-words" data-testid={`text-content-${item.post.id}`}>
            {item.post.content}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {Object.entries(REACTION_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              const count = item.reactionCounts[type] || 0;
              const isActive = item.userReaction === type;
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReactionClick(type)}
                  disabled={addReaction.isPending || removeReaction.isPending}
                  className={`gap-1 ${isActive ? config.activeColor : "text-muted-foreground"}`}
                  data-testid={`button-reaction-${type}-${item.post.id}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "fill-current" : ""}`} />
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="gap-1 text-muted-foreground"
              data-testid={`button-comments-${item.post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              {item.commentCount > 0 && <span className="text-xs">{item.commentCount}</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGiftDialogOpen(true)}
              className="gap-1 text-muted-foreground"
              data-testid={`button-gift-${item.post.id}`}
            >
              <Gift className="w-4 h-4" />
            </Button>
          </div>
          <GiftDialog toUser={item.user} open={giftDialogOpen} onOpenChange={setGiftDialogOpen} />

          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {comments.map((c) => (
                        <div key={c.comment.id} className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={c.user.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {(c.user.firstName?.[0] || c.user.email?.[0] || "U").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {c.user.firstName || c.user.email?.split("@")[0] || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(c.comment.createdAt!), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 break-words">{c.comment.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteComment.mutate(c.comment.id)}
                            data-testid={`button-delete-comment-${c.comment.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-start gap-3">
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 min-h-[60px] resize-none"
                          data-testid={`input-comment-${item.post.id}`}
                        />
                        <Button
                          size="icon"
                          onClick={() => {
                            if (commentText.trim()) {
                              addComment.mutate(commentText.trim());
                            }
                          }}
                          disabled={addComment.isPending || !commentText.trim()}
                          data-testid={`button-submit-comment-${item.post.id}`}
                        >
                          {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}

function CreatePostDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [postType, setPostType] = useState<string>("practice_share");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const createPost = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", { type: postType, content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/feed'] });
      toast({ title: "Post shared with the community" });
      setContent("");
      setPostType("practice_share");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-dark border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share with Community</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger data-testid="select-post-type">
              <SelectValue placeholder="Select post type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POST_TYPE_CONFIG).map(([value, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            data-testid="input-post-content"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-post">
              Cancel
            </Button>
            <Button
              onClick={() => createPost.mutate()}
              disabled={createPost.isPending || !content.trim()}
              data-testid="button-submit-post"
            >
              {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Community() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [feedData, setFeedData] = useState<FeedItem[]>([]);

  const { isLoading, isError } = useQuery<FeedItem[]>({
    queryKey: ['/api/community/feed'],
    select: (data) => {
      setFeedData(data);
      return data;
    },
  });

  const handleReactionChange = (postId: string, reactionCounts: Record<string, number>, userReaction?: string) => {
    setFeedData((prev) =>
      prev.map((item) =>
        item.post.id === postId ? { ...item, reactionCounts, userReaction } : item
      )
    );
  };

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="max-w-2xl mx-auto pt-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground text-glow-purple">Community</h1>
          <p className="text-muted-foreground mt-2">Share your journey and support others</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <GlassCard variant="dark" className="text-center py-12">
            <p className="text-muted-foreground">Failed to load community feed</p>
            <Button
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/community/feed'] })}
              className="mt-4"
            >
              Try Again
            </Button>
          </GlassCard>
        ) : feedData.length === 0 ? (
          <GlassCard variant="dark" className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">No posts yet</p>
            <p className="text-muted-foreground mt-2">Be the first to share something with the community!</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="mt-4" data-testid="button-first-post">
              Create First Post
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {feedData.map((item) => (
              <PostCard key={item.post.id} item={item} onReactionChange={handleReactionChange} />
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={() => setCreateDialogOpen(true)}
        size="lg"
        className="fixed bottom-24 right-6 rounded-full shadow-lg glow-purple"
        data-testid="button-create-post"
      >
        <Plus className="w-5 h-5 mr-2" />
        Share
      </Button>

      <CreatePostDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
