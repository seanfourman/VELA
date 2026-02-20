import { useCallback, useEffect, useState } from "react";
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

export function useCognitoAuth() {
  const localOnlyMode =
    String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !==
    "false";
  const [session, setSession] = useState(() => getStoredSession());
  const [isLoading, setIsLoading] = useState(() => !localOnlyMode);

  useEffect(() => {
    if (localOnlyMode) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);

      try {
        const result = await completeLoginFromRedirect();
        if (result?.status === "error" && result?.error) {
          showPopup(result.error, "failure", { duration: 7000 });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Login failed. Please retry.";
        showPopup(message, "failure", { duration: 7000 });
      }

      const nextSession = await ensureValidSession();
      if (!cancelled) {
        setSession(nextSession);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localOnlyMode]);

  const isAuthenticated = localOnlyMode ? true : isSessionValid(session);
  const user = localOnlyMode
    ? {
        name: "Local User",
        is_admin: true,
        roles: ["admin"],
        groups: ["admin"],
      }
    : decodeJwtPayload(session?.id_token);

  const signIn = useCallback(async () => {
    if (localOnlyMode) {
      showPopup("Local mode is enabled. Cloud sign-in is not required.", "info", {
        duration: 3500,
      });
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
      showPopup("Local mode is active. No cloud session to sign out.", "info", {
        duration: 2600,
      });
      return;
    }
    try {
      if (!isCognitoConfigured()) return;
      signOutToCognito();
    } catch {
      // Ignore sign-out errors in local mode.
    }
  }, [localOnlyMode]);

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  };
}

export default useCognitoAuth;
