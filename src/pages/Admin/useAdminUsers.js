import { useCallback, useEffect, useRef, useState } from "react";
import { fetchManagedUsers, updateManagedUserAccess } from "@/utils/adminUsersApi";

export default function useAdminUsers({ enabled }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadUsers = useCallback(async () => {
    if (!enabled) return [];

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    try {
      const nextUsers = await fetchManagedUsers();
      if (isMountedRef.current) {
        setUsers(nextUsers);
        setLoadError("");
      }
      return nextUsers;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load admin users";
      if (isMountedRef.current) {
        setLoadError(message);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    loadUsers().catch(() => {});
  }, [enabled, loadUsers]);

  const saveUserAccess = useCallback(async ({ userId, isAdmin, role }) => {
    const normalizedId = String(userId || "").trim();
    if (!normalizedId) {
      throw new Error("A user id is required.");
    }

    if (isMountedRef.current) {
      setPendingUserId(normalizedId);
    }
    try {
      const updatedUser = await updateManagedUserAccess({
        userId: normalizedId,
        isAdmin,
        role,
      });

      if (isMountedRef.current) {
        setUsers((current) =>
          current.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
        );
        setLoadError("");
      }
      return updatedUser;
    } finally {
      if (isMountedRef.current) {
        setPendingUserId("");
      }
    }
  }, []);

  return {
    users,
    isLoading,
    loadError,
    pendingUserId,
    loadUsers,
    saveUserAccess,
  };
}
