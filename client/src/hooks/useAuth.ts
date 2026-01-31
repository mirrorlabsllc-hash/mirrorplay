import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  // 401 means not authenticated - return null, don't throw
  if (response.status === 401) {
    return null;
  }

  // Other errors should fail
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    let active = true;

    queryClient
      .fetchQuery({
        queryKey: ["/api/auth/user"],
        queryFn: fetchUser,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
      })
      .catch(() => {
        // Swallow errors so auth can still resolve.
      })
      .finally(() => {
        if (active) setInitialized(true);
      });

    return () => {
      active = false;
    };
  }, [initialized, queryClient]);

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: initialized,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading: !initialized,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
