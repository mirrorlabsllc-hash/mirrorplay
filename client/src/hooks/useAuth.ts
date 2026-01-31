import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

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
  const lastExchangedTokenRef = useRef<string | null>(null);

  const exchangeSupabaseSession = useCallback(
    async (accessToken: string | null | undefined) => {
      if (!accessToken) return null;
      if (lastExchangedTokenRef.current === accessToken) {
        return queryClient.getQueryData<User | null>(["/api/auth/user"]) ?? null;
      }
      lastExchangedTokenRef.current = accessToken;

      try {
        await apiRequest("POST", "/api/auth/supabase", { accessToken });
        const user = await fetchUser();
        queryClient.setQueryData(["/api/auth/user"], user);
        return user;
      } catch {
        return null;
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (initialized) return;
    let active = true;

    const initialize = async () => {
      let currentUser: User | null = null;

      try {
        currentUser = await fetchUser();
      } catch {
        currentUser = null;
      }

      if (!currentUser) {
        try {
          const { data } = await supabase.auth.getSession();
          currentUser = await exchangeSupabaseSession(
            data.session?.access_token
          );
        } catch {
          // Ignore Supabase exchange errors to avoid blocking boot.
        }
      }

      if (active) {
        queryClient.setQueryData(["/api/auth/user"], currentUser);
        setInitialized(true);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, [initialized, queryClient, exchangeSupabaseSession]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      exchangeSupabaseSession(session?.access_token);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [exchangeSupabaseSession]);

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
