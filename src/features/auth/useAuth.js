import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchSessionUser,
  loginUser,
  persistAuthSession,
  readAuthState,
  registerUser,
} from "./auth";

export function useAuth() {
  const [authState, setAuthState] = useState(() => readAuthState());
  const session = authState.session;
  const user = session?.user || null;
  const token = session?.token || "";
  const isAuthenticated = Boolean(token && user);

  const updateSession = useCallback((nextSession) => {
    setAuthState({ session: nextSession || null });
  }, []);

  const signOut = useCallback(() => {
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
    if (!session?.token) return;
    if (session?.user) return;

    let cancelled = false;
    (async () => {
      try {
        const resolvedUser = await fetchSessionUser(session.token);
        if (cancelled || !resolvedUser) return;
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
