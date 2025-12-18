import { useCallback, useEffect, useState } from "react";
import showPopup from "../utils/popup";
import {
  completeLoginFromRedirect,
  decodeJwtPayload,
  ensureValidSession,
  getStoredSession,
  isSessionValid,
  beginLogin,
  signOutToCognito,
} from "../utils/cognitoAuth";

export function useCognitoAuth() {
  const [session, setSession] = useState(() => getStoredSession());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const isAuthenticated = isSessionValid(session);
  const user = decodeJwtPayload(session?.id_token);

  const signIn = useCallback(async () => {
    await beginLogin();
  }, []);

  const signOut = useCallback(() => {
    signOutToCognito();
  }, []);

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
