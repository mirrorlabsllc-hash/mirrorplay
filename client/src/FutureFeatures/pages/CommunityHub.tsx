import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  MessageSquare,
  UserPlus,
  Heart,
  Gift,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import type { User } from "@shared/schema";

interface FriendData {
  id: string;
  visitorId: string;
  friendId: string;
  status: string;
  friend: User;
}

export default function CommunityHub() {
  const { data: friends } = useQuery<FriendData[]>({
    queryKey: ["/api/friends"],
  });

  const { data: pendingGifts } = useQuery<any[]>({
    queryKey: ["/api/gifts/pending"],
  });

  const acceptedFriends = friends?.filter(f => f.status === "accepted") || [];
  const pendingRequests = friends?.filter(f => f.status === "pending") || [];

  const communityItems = [
    {
      id: "feed",
      icon: MessageSquare,
      title: "Community Feed",
      description: "Share and connect with others",
      href: "/community",
      color: "from-violet-500 to-purple-500",
      badge: null,
    },
    {
      id: "friends",
      icon: Users,
      title: "Friends",
      description: `${acceptedFriends.length} friends`,
      href: "/social",
      color: "from-pink-500 to-rose-500",
      badge: pendingRequests.length > 0 ? `${pendingRequests.length} pending` : null,
    },
    {
      id: "gifts",
      icon: Gift,
      title: "Gifts",
      description: "Send and receive gifts",
      href: "/gifts",
      color: "from-amber-500 to-orange-500",
      badge: pendingGifts?.length ? `${pendingGifts.length} new` : null,
    },
  ];

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="community-hub">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-muted-foreground">Connect with fellow practitioners</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link to="/community/search">
          <GlassCard variant="dark" className="hover-elevate">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Find users...</span>
            </div>
          </GlassCard>
        </Link>
      </motion.div>

      <div className="space-y-3">
        {communityItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Link to={item.href}>
              <GlassCard 
                variant="dark" 
                className="hover-elevate"
                data-testid={`community-item-${item.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.badge && (
                        <Badge className="text-xs bg-primary">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {acceptedFriends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Friends</h2>
            <Link to="/social">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            {acceptedFriends.slice(0, 5).map((friend) => (
              <Link key={friend.id} to={`/user/${friend.friendId}`}>
                <motion.div 
                  className="flex flex-col items-center gap-2 min-w-[72px]"
                  whileTap={{ scale: 0.95 }}
                >
                  <Avatar className="w-14 h-14 ring-2 ring-primary/30">
                    <AvatarImage src={friend.friend.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {friend.friend.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center truncate w-16">
                    {friend.friend.firstName || "User"}
                  </span>
                </motion.div>
              </Link>
            ))}
            
            <Link to="/community/search">
              <motion.div 
                className="flex flex-col items-center gap-2 min-w-[72px]"
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Add</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard variant="glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Share your journey</p>
              <p className="text-sm text-muted-foreground">
                Post achievements and inspire others
              </p>
            </div>
            <Link to="/community">
              <Button size="sm">Post</Button>
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
