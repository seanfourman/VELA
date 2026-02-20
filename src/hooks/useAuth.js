import { useCallback, useMemo, useState } from "react";
import {
  loginLocalUser,
  mapLocalUserToAuthUser,
  persistLocalSession,
  readLocalAuthState,
  registerLocalUser,
} from "./auth";

export function useAuth() {
  const [localState, setLocalState] = useState(() => readLocalAuthState());
  const localUsers = localState.users;
  const localSession = localState.session;

  const updateLocalUsers = useCallback((users) => {
    setLocalState((prev) => ({ ...prev, users }));
  }, []);

  const updateLocalSession = useCallback((nextSession) => {
    setLocalState((prev) => ({ ...prev, session: nextSession }));
  }, []);

  const activeLocalUser = useMemo(() => {
    if (!localSession?.userId) return null;
    return localUsers.find((entry) => entry.id === localSession.userId) || null;
  }, [localSession, localUsers]);

  const isAuthenticated = Boolean(activeLocalUser);
  const user = mapLocalUserToAuthUser(activeLocalUser);

  const signOut = useCallback(() => {
    persistLocalSession(null);
    updateLocalSession(null);
  }, [updateLocalSession]);

  const login = useCallback(
    async ({ email, password } = {}) => {
      const localUser = await loginLocalUser({
        localUsers,
        email,
        password,
        updateLocalUsers,
      });
      const nextSession = { userId: localUser.id };
      persistLocalSession(nextSession);
      updateLocalSession(nextSession);
      return mapLocalUserToAuthUser(localUser);
    },
    [localUsers, updateLocalSession, updateLocalUsers]
  );

  const register = useCallback(
    async ({ name, email, password } = {}) => {
      const localUser = await registerLocalUser({
        localUsers,
        name,
        email,
        password,
        updateLocalUsers,
      });
      const nextSession = { userId: localUser.id };
      persistLocalSession(nextSession);
      updateLocalSession(nextSession);
      return mapLocalUserToAuthUser(localUser);
    },
    [localUsers, updateLocalSession, updateLocalUsers]
  );

  return {
    session: localSession,
    user,
    isAuthenticated,
    signOut,
    login,
    register,
  };
}
