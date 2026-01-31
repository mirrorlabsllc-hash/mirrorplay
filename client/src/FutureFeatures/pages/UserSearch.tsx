import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Search, 
  UserPlus, 
  Loader2,
  Users,
  Check
} from "lucide-react";
import type { User } from "@shared/schema";

interface SearchResult {
  users: User[];
}

interface FriendData {
  id: string;
  visitorId: string;
  friendId: string;
  status: string;
}

export default function UserSearch() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: searchResults, isLoading, refetch } = useQuery<SearchResult>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: false,
  });

  const { data: friends } = useQuery<FriendData[]>({
    queryKey: ["/api/friends"],
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
    onSuccess: () => {
      setHasSearched(true);
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await apiRequest("POST", "/api/friends", { friendId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend request sent!",
        description: "They'll be notified of your request.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send request",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim().length < 2) {
      toast({
        title: "Search query too short",
        description: "Please enter at least 2 characters",
      });
      return;
    }
    searchMutation.mutate(searchQuery.trim());
  };

  const isFriend = (userId: string) => {
    return friends?.some(f => f.friendId === userId || f.visitorId === userId);
  };

  const getFriendStatus = (userId: string) => {
    const friend = friends?.find(f => f.friendId === userId || f.visitorId === userId);
    return friend?.status;
  };

  const users = searchMutation.data?.users || [];

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.header
        className="flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate("/community")} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Find Users</h1>
          <p className="text-sm text-muted-foreground">Search and connect with others</p>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by username..."
            className="flex-1"
            data-testid="input-search-users"
          />
          <Button 
            onClick={handleSearch}
            disabled={searchMutation.isPending}
            data-testid="button-search"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {searchMutation.isPending && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasSearched && !searchMutation.isPending && users.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <GlassCard variant="dark" className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
            </GlassCard>
          </motion.div>
        )}

        {users.map((user, index) => {
          const friendStatus = getFriendStatus(user.id);
          const isAlreadyFriend = friendStatus === "accepted";
          const isPending = friendStatus === "pending";

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard variant="dark" className="hover-elevate">
                <div className="flex items-center gap-4">
                  <Link to={`/users/${user.id}`}>
                    <Avatar className="w-12 h-12 cursor-pointer">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {(user.username || user.firstName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link to={`/users/${user.id}`}>
                      <h3 className="font-semibold truncate hover:text-primary cursor-pointer">
                        {user.username || user.firstName || "User"}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      Level {user.level || 1}
                    </p>
                  </div>

                  {isAlreadyFriend ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      <Check className="w-3 h-3 mr-1" />
                      Friends
                    </Badge>
                  ) : isPending ? (
                    <Badge variant="secondary">Pending</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => addFriendMutation.mutate(user.id)}
                      disabled={addFriendMutation.isPending}
                      data-testid={`button-add-friend-${user.id}`}
                    >
                      {addFriendMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {!hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-8"
        >
          <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Search for users by username</p>
        </motion.div>
      )}
    </div>
  );
}
