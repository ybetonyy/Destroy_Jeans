import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRole = async (userId: string | undefined, userEmail?: string) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    const admins = ["faustoplaystationfafatube@gmail.com", "hikef005@gmail.com"];
    const cleanEmail = userEmail?.toLowerCase().trim();
    
    if (cleanEmail && admins.includes(cleanEmail)) {
      setIsAdmin(true);
    } else {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkRole(newSession?.user?.id, newSession?.user?.email);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkRole(s?.user?.id, s?.user?.email).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  const refreshRole = async () => {
    await checkRole(session?.user?.id, session?.user?.email);
  };

  return (
    <Ctx.Provider
      value={{ user: session?.user ?? null, session, isAdmin, loading, signOut, refreshRole }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
