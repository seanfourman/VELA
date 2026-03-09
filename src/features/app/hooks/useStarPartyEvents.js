import { useCallback, useEffect, useState } from "react";
import {
  deleteEventById,
  getRsvpUserId,
  readEventsFromStorage,
  saveEvent,
  toggleRsvp,
  writeEventsToStorage,
} from "@/features/starParty/starPartyStorage";
import { isAdminUser } from "@/utils/appState";

const buildHost = (activeUser) => ({
  id: getRsvpUserId(activeUser),
  name:
    String(activeUser?.name || activeUser?.preferred_username || "").trim() ||
    "Admin",
  email: String(activeUser?.email || "").trim(),
});

export const useStarPartyEvents = ({ activeUser }) => {
  const [starPartyEvents, setStarPartyEvents] = useState(() =>
    readEventsFromStorage(),
  );

  useEffect(() => {
    writeEventsToStorage(starPartyEvents);
  }, [starPartyEvents]);

  const handleSaveStarPartyEvent = useCallback(
    (draft) => {
      if (!isAdminUser(activeUser)) return;
      setStarPartyEvents((prev) =>
        saveEvent({
          events: prev,
          draft,
          host: buildHost(activeUser),
        }).events,
      );
    },
    [activeUser],
  );

  const handleDeleteStarPartyEvent = useCallback(
    (eventId) => {
      if (!isAdminUser(activeUser)) return;
      setStarPartyEvents((prev) => deleteEventById({ events: prev, eventId }));
    },
    [activeUser],
  );

  const handleSetStarPartyEventStatus = useCallback(
    ({ eventId, status }) => {
      if (!isAdminUser(activeUser)) return;
      setStarPartyEvents((prev) => {
        const target = prev.find((event) => event.id === eventId);
        if (!target) return prev;

        return saveEvent({
          events: prev,
          draft: { ...target, status },
          host: target.host || buildHost(activeUser),
        }).events;
      });
    },
    [activeUser],
  );

  const handleToggleStarPartyRsvp = useCallback(({ eventId, user }) => {
    setStarPartyEvents((prev) => toggleRsvp({ events: prev, eventId, user }).events);
  }, []);

  return {
    starPartyEvents,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    handleToggleStarPartyRsvp,
  };
};
