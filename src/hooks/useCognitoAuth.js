import { useCallback, useEffect, useMemo, useState } from "react";
import showPopup from "../utils/popup";
import {
  completeLoginFromRedirect,
  decodeJwtPayload,
  ensureValidSession,
  getStoredSession,
  isSessionValid,
  isCognitoConfigured,
  beginLogin,
  signOutToCognito,
} from "../utils/cognitoAuth";
import {
  loginLocalUser,
  mapLocalUserToAuthUser,
  persistLocalSession,
  readLocalAuthState,
  registerLocalUser,
} from "./localAuth";

export function useCognitoAuth() {
  const localOnlyMode =
    String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !== "false";
  const [session, setSession] = useState(() =>
    localOnlyMode ? null : getStoredSession(),
  );
  const [localState, setLocalState] = useState(() =>
    localOnlyMode ? readLocalAuthState() : { users: [], session: null },
  );
  const [remoteLoading, setRemoteLoading] = useState(() => !localOnlyMode);
  const localUsers = localState.users;
  const localSession = localState.session;
  const isLoading = localOnlyMode ? false : remoteLoading;

  const updateLocalUsers = useCallback((users) => {
    setLocalState((prev) => ({ ...prev, users }));
  }, []);

  const updateLocalSession = useCallback((nextSession) => {
    setLocalState((prev) => ({ ...prev, session: nextSession }));
  }, []);

  useEffect(() => {
    if (localOnlyMode) return undefined;

    let cancelled = false;
    (async () => {
      setRemoteLoading(true);

      try {
        const result = await completeLoginFromRedirect();
        if (result?.status === "error" && result?.error) {
          showPopup(result.error, "failure", { duration: 7000 });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Login failed. Please retry.";
        showPopup(message, "failure", { duration: 7000 });
      }

      const nextSession = await ensureValidSession();
      if (!cancelled) {
        setSession(nextSession);
        setRemoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localOnlyMode]);

  const activeLocalUser = useMemo(() => {
    if (!localOnlyMode || !localSession?.userId) return null;
    return localUsers.find((entry) => entry.id === localSession.userId) || null;
  }, [localOnlyMode, localSession, localUsers]);

  const isAuthenticated = localOnlyMode
    ? Boolean(activeLocalUser)
    : isSessionValid(session);
  const user = localOnlyMode
    ? mapLocalUserToAuthUser(activeLocalUser)
    : decodeJwtPayload(session?.id_token);

  const signIn = useCallback(async () => {
    if (localOnlyMode) {
      showPopup(
        "Local mode uses the login/register page. Open Sign In to continue.",
        "info",
        { duration: 3500 },
      );
      return;
    }
    try {
      await beginLogin();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login is unavailable.";
      showPopup(message, "failure", { duration: 4500 });
    }
  }, [localOnlyMode]);

  const signOut = useCallback(() => {
    if (localOnlyMode) {
      persistLocalSession(null);
      updateLocalSession(null);
      return;
    }
    try {
      if (!isCognitoConfigured()) return;
      signOutToCognito();
    } catch {
      // Ignore sign-out errors in local mode.
    }
  }, [localOnlyMode, updateLocalSession]);

  const login = useCallback(
    async ({ email, password } = {}) => {
      if (!localOnlyMode) {
        await signIn();
        return null;
      }

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
    [localOnlyMode, localUsers, signIn, updateLocalSession, updateLocalUsers],
  );

  const register = useCallback(
    async ({ name, email, password } = {}) => {
      if (!localOnlyMode) {
        await signIn();
        return null;
      }

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
    [localOnlyMode, localUsers, signIn, updateLocalSession, updateLocalUsers],
  );

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    localOnlyMode,
    signIn,
    signOut,
    login,
    register,
  };
}
