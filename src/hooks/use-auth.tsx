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

   const checkRole = async (userId: string | undefined) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    // Lista de e-mails autorizados (você e seu cliente)
    const admins = ["faustoplaystationfafatube@gmail.com", "hikef005@gmail.com"];
    
    // Pega o e-mail da sessão atual e limpa espaços/letras grandes
    const userEmail = session?.user?.email?.toLowerCase().trim();
    
    // Se o e-mail estiver na lista, o botão ADMIN aparece na hora
    if (userEmail && admins.includes(userEmail)) {
      setIsAdmin(true);
    } else {
      // Caso contrário, ele ainda tenta checar o banco por segurança
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
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Defer DB call to avoid deadlocks
      setTimeout(() => checkRole(newSession?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkRole(s?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    await checkRole(session?.user?.id);
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
