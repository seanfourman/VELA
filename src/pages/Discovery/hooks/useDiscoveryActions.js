import { useCallback, useState } from "react";
import { getRsvpUserId } from "@/features/starParty/starPartyUtils";
import showNotification from "@/utils/notifications";
import { buildDiscoveryMapSelection } from "../discoveryUtils";

export default function useDiscoveryActions({
  auth,
  isAuthenticated,
  onNavigate,
  onToggleStarPartyRsvp,
}) {
  const [pendingRsvpEventId, setPendingRsvpEventId] = useState("");
  const activeUserRsvpId = getRsvpUserId(auth?.user);

  const openMapSelection = useCallback(
    (selection) => {
      if (!selection) return;
      onNavigate?.("/", { state: { mapSelection: selection } });
    },
    [onNavigate],
  );

  const handleOpenDarkSpotOnMap = useCallback(
    (spot) => {
      if (!spot) return;
      openMapSelection(
        buildDiscoveryMapSelection({
          type: "pin",
          id: `dark-${spot.lat}-${spot.lon}`,
          lat: spot.lat,
          lng: spot.lon,
        }),
      );
    },
    [openMapSelection],
  );

  const handleOpenRecommendationOnMap = useCallback(
    (spot) => {
      if (!spot) return;
      openMapSelection(
        buildDiscoveryMapSelection({
          type: "stargaze",
          id: spot.id,
          lat: spot.lat,
          lng: spot.lng,
        }),
      );
    },
    [openMapSelection],
  );

  const handleOpenFavoriteOnMap = useCallback(
    (spot) => {
      if (!spot) return;
      openMapSelection(
        buildDiscoveryMapSelection({
          type: "pin",
          id: spot.key,
          lat: spot.lat,
          lng: spot.lng,
        }),
      );
    },
    [openMapSelection],
  );

  const handleOpenEventOnMap = useCallback(
    (event) => {
      if (!event) return;
      openMapSelection(
        buildDiscoveryMapSelection({
          type: "event",
          id: event.id,
          lat: event.lat,
          lng: event.lng,
        }),
      );
    },
    [openMapSelection],
  );

  const handleEventRsvpAction = useCallback(
    async (event) => {
      if (!event?.id) return;

      if (!isAuthenticated) {
        onNavigate?.("/auth");
        return;
      }

      if (!onToggleStarPartyRsvp || pendingRsvpEventId === event.id) {
        return;
      }

      const currentRsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
      const isAlreadyJoined = Boolean(
        activeUserRsvpId &&
          currentRsvps.some(
            (entry) => String(entry.userId) === String(activeUserRsvpId),
          ),
      );

      setPendingRsvpEventId(event.id);

      try {
        const result = await onToggleStarPartyRsvp({ eventId: event.id });
        const joinedNow =
          typeof result?.joined === "boolean"
            ? result.joined
            : !isAlreadyJoined;
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
      } finally {
        setPendingRsvpEventId((current) =>
          current === event.id ? "" : current,
        );
      }
    },
    [
      activeUserRsvpId,
      isAuthenticated,
      onNavigate,
      onToggleStarPartyRsvp,
      pendingRsvpEventId,
    ],
  );

  return {
    activeUserRsvpId,
    pendingRsvpEventId,
    handleOpenDarkSpotOnMap,
    handleOpenRecommendationOnMap,
    handleOpenFavoriteOnMap,
    handleOpenEventOnMap,
    handleEventRsvpAction,
  };
}
