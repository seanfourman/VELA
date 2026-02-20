import { useCallback, useMemo, useState } from "react";
import {
  loginUser,
  mapUserToAuthUser,
  persistAuthSession,
  readAuthState,
  registerUser,
} from "./auth";

export function useAuth() {
  const [authState, setAuthState] = useState(() => readAuthState());
  const users = authState.users;
  const session = authState.session;

  const updateUsers = useCallback((users) => {
    setAuthState((prev) => ({ ...prev, users }));
  }, []);

  const updateSession = useCallback((nextSession) => {
    setAuthState((prev) => ({ ...prev, session: nextSession }));
  }, []);

  const activeUser = useMemo(() => {
    if (!session?.userId) return null;
    return users.find((entry) => entry.id === session.userId) || null;
  }, [session, users]);

  const isAuthenticated = Boolean(activeUser);
  const user = mapUserToAuthUser(activeUser);

  const signOut = useCallback(() => {
    persistAuthSession(null);
    updateSession(null);
  }, [updateSession]);

  const login = useCallback(
    async ({ email, password } = {}) => {
      const authUser = await loginUser({
        users,
        email,
        password,
        updateUsers,
      });
      const nextSession = { userId: authUser.id };
      persistAuthSession(nextSession);
      updateSession(nextSession);
      return mapUserToAuthUser(authUser);
    },
    [users, updateSession, updateUsers]
  );

  const register = useCallback(
    async ({ name, email, password } = {}) => {
      const authUser = await registerUser({
        users,
        name,
        email,
        password,
        updateUsers,
      });
      const nextSession = { userId: authUser.id };
      persistAuthSession(nextSession);
      updateSession(nextSession);
      return mapUserToAuthUser(authUser);
    },
    [users, updateSession, updateUsers]
  );

  return {
    session,
    user,
    isAuthenticated,
    signOut,
    login,
    register,
  };
}
