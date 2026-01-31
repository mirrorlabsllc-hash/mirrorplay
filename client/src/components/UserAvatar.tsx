import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import type { User } from "@shared/schema";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  size?: AvatarSize;
  className?: string;
  profileImageUrl?: string;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 96,
};

export function UserAvatar({ 
  size = "md", 
  className = "",
  profileImageUrl
}: UserAvatarProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !profileImageUrl,
  });

  const pixelSize = sizeMap[size];
  const imageUrl = profileImageUrl || user?.profileImageUrl;
  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '';

  if (isLoading && !profileImageUrl) {
    return (
      <Skeleton 
        className={`rounded-full ${className}`} 
        style={{ width: pixelSize, height: pixelSize }} 
      />
    );
  }

  return (
    <Avatar 
      className={className}
      style={{ width: pixelSize, height: pixelSize }}
      data-testid="user-avatar"
    >
      {imageUrl && (
        <AvatarImage src={imageUrl} alt="Profile" />
      )}
      <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        {initials || <UserIcon className="w-1/2 h-1/2 text-purple-400/60" />}
      </AvatarFallback>
    </Avatar>
  );
}
