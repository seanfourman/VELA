import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSessionUser,
  loginUser,
  persistAuthSession,
  readAuthState,
  registerUser,
} from "./auth";

export function useAuth() {
  const [authState, setAuthState] = useState(() => readAuthState());
  const validatedTokenRef = useRef("");
  const session = authState.session;
  const user = session?.user || null;
  const token = session?.token || "";
  const isAuthenticated = Boolean(token && user);

  const updateSession = useCallback((nextSession) => {
    setAuthState({ session: nextSession || null });
  }, []);

  const signOut = useCallback(() => {
    validatedTokenRef.current = "";
    persistAuthSession(null);
    updateSession(null);
  }, [updateSession]);

  const commitSession = useCallback(
    (nextSession) => {
      persistAuthSession(nextSession);
      updateSession(nextSession);
      return nextSession?.user || null;
    },
    [updateSession],
  );

  const login = useCallback(
    async ({ email, password } = {}) => {
      const nextSession = await loginUser({ email, password });
      return commitSession(nextSession);
    },
    [commitSession],
  );

  const register = useCallback(
    async ({ name, email, password } = {}) => {
      const nextSession = await registerUser({ name, email, password });
      return commitSession(nextSession);
    },
    [commitSession],
  );
  const applySession = useCallback(
    (nextSession) => commitSession(nextSession),
    [commitSession],
  );

  useEffect(() => {
    const sessionToken = String(session?.token || "").trim();
    if (!sessionToken) {
      validatedTokenRef.current = "";
      return;
    }
    if (validatedTokenRef.current === sessionToken) return;

    let cancelled = false;
    (async () => {
      try {
        const resolvedUser = await fetchSessionUser(sessionToken);
        if (cancelled || !resolvedUser) return;
        validatedTokenRef.current = sessionToken;
        const nextSession = {
          ...session,
          user: resolvedUser,
        };
        commitSession(nextSession);
      } catch {
        if (cancelled) return;
        signOut();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [commitSession, session, signOut]);

  return useMemo(
    () => ({
      session,
      token,
      user,
      isAuthenticated,
      signOut,
      login,
      register,
      applySession,
    }),
    [applySession, isAuthenticated, login, register, session, signOut, token, user],
  );
}
