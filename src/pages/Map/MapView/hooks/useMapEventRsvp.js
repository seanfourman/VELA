import { useCallback } from "react";
import showNotification from "@/utils/notifications";

export default function useMapEventRsvp({
  isAuthenticated,
  activeUserRsvpId,
  onToggleStarPartyRsvp,
}) {
  const handleToggleEventRsvp = useCallback(
    async (event) => {
      if (!event?.id) return;
      if (!isAuthenticated || !activeUserRsvpId) {
        showNotification("Sign in to RSVP to events", "failure", {
          duration: 2400,
        });
        return;
      }
      const currentRsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
      const isAlreadyJoined = currentRsvps.some(
        (entry) => entry.userId === activeUserRsvpId,
      );
      try {
        const result = await onToggleStarPartyRsvp?.({ eventId: event.id });
        const joinedNow =
          typeof result?.joined === "boolean" ? result.joined : !isAlreadyJoined;
        const eventLabel = event.title || "this event";
        showNotification(
          joinedNow
            ? `RSVP confirmed for ${eventLabel}`
            : `RSVP removed from ${eventLabel}`,
          joinedNow ? "success" : "failure",
          { duration: 1800 },
        );
      } catch (error) {
        showNotification(
          error instanceof Error
            ? error.message
            : "Could not update RSVP right now",
          "failure",
          { duration: 2600 },
        );
      }
    },
    [activeUserRsvpId, isAuthenticated, onToggleStarPartyRsvp],
  );

  return {
    handleToggleEventRsvp,
  };
}
