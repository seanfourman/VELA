import { useCallback, useEffect, useState } from "react";
import {
  normalizeEventList,
  removeEventFromList,
  upsertEventInList,
} from "@/features/starParty/starPartyUtils";
import { isAdminUser } from "@/utils/appState";
import showNotification from "@/utils/notifications";
import {
  deleteStarPartyEvent,
  fetchStarPartyEvents,
  saveStarPartyEvent,
  setStarPartyEventStatus,
  toggleStarPartyRsvp,
} from "@/utils/starPartyEventsApi";

export const useStarPartyEvents = ({ activeUser }) => {
  const [starPartyEvents, setStarPartyEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const events = await fetchStarPartyEvents();
        if (cancelled) return;
        setStarPartyEvents(normalizeEventList(events));
      } catch (error) {
        if (cancelled) return;
        showNotification(
          error instanceof Error ? error.message : "Could not load star party events",
          "failure",
          { duration: 3200 },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveStarPartyEvent = useCallback(
    async (draft) => {
      if (!isAdminUser(activeUser)) return;
      const saved = await saveStarPartyEvent({ event: draft });
      setStarPartyEvents((prev) => upsertEventInList(prev, saved));
      return saved;
    },
    [activeUser],
  );

  const handleDeleteStarPartyEvent = useCallback(
    async (eventId) => {
      if (!isAdminUser(activeUser)) return;
      await deleteStarPartyEvent({ eventId });
      setStarPartyEvents((prev) => removeEventFromList(prev, eventId));
    },
    [activeUser],
  );

  const handleSetStarPartyEventStatus = useCallback(
    async ({ eventId, status }) => {
      if (!isAdminUser(activeUser)) return;
      const updated = await setStarPartyEventStatus({ eventId, status });
      setStarPartyEvents((prev) => upsertEventInList(prev, updated));
      return updated;
    },
    [activeUser],
  );

  const handleToggleStarPartyRsvp = useCallback(async ({ eventId }) => {
    const result = await toggleStarPartyRsvp({ eventId });
    if (result?.event) {
      setStarPartyEvents((prev) => upsertEventInList(prev, result.event));
    }
    return result;
  }, []);

  return {
    starPartyEvents,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    handleToggleStarPartyRsvp,
  };
};

