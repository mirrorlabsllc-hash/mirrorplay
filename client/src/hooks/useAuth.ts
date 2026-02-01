import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

async function fetchUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    return null;
  }

  const response = await fetch("/api/auth/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
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
  await supabase.auth.signOut();
  window.location.href = "/";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
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
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setInitialized(true);
      if (data.session?.access_token) {
        exchangeSupabaseSession(data.session.access_token);
      } else {
        queryClient.setQueryData(["/api/auth/user"], null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession ?? null);
        setInitialized(true);
        if (nextSession?.access_token) {
          exchangeSupabaseSession(nextSession.access_token);
        } else {
          queryClient.setQueryData(["/api/auth/user"], null);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [exchangeSupabaseSession]);

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: initialized && !!session,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    session,
    isLoading: !initialized,
    isAuthenticated: !!session || !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
