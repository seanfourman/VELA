import { useState } from "react";
import showNotification from "@/utils/notifications";
import {
  deleteRecommendation,
  saveRecommendation,
} from "@/utils/recommendationsApi";
import { EMPTY_EVENT, EMPTY_LOCATION } from "../adminConstants";
import {
  buildDraftFromEvent,
  buildEventFromDraft,
  buildEventId,
} from "../adminEventUtils";
import {
  buildDraftFromLocation,
  buildLocationFromDraft,
  buildLocationId,
} from "../adminUtils";
import {
  buildApiLocation,
  validateEventDraft,
  validateLocationDraft,
} from "../adminSubmission";

export default function useAdminWorkspaceActions({
  currentUserId,
  saveUserAccess,
  onSaveStargazeLocation,
  onDeleteStargazeLocation,
  onSaveStarPartyEvent,
  onDeleteStarPartyEvent,
  onSetStarPartyEventStatus,
}) {
  const [locationDraft, setLocationDraft] = useState(EMPTY_LOCATION);
  const [eventDraft, setEventDraft] = useState(EMPTY_EVENT);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmBusy, setIsDeleteConfirmBusy] = useState(false);
  const editingLocationId = String(locationDraft.id || "").trim();
  const editingEventId = String(eventDraft.id || "").trim();
  const isEditingLocation = Boolean(editingLocationId);
  const isEditingEvent = Boolean(editingEventId);

  const handleLocationFieldChange = (key) => (event) => {
    const value = event.target.value;
    setLocationDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEventFieldChange = (key) => (event) => {
    const value = event.target.value;
    setEventDraft((current) => ({ ...current, [key]: value }));
  };

  const resetLocationForm = () => setLocationDraft(EMPTY_LOCATION);
  const resetEventForm = () => setEventDraft(EMPTY_EVENT);

  const handleEditLocation = (location) => {
    const nextDraft = buildDraftFromLocation(location);
    if (!nextDraft) return;
    setLocationDraft(nextDraft);
    showNotification("Editing selected location", "info", { duration: 1800 });
  };

  const handleEditEvent = (event) => {
    const nextDraft = buildDraftFromEvent(event);
    if (!nextDraft) return;
    setEventDraft(nextDraft);
    showNotification("Editing selected event", "info", { duration: 1800 });
  };

  const performDeleteLocation = async (location) => {
    const locationId = location?.id;
    if (!locationId) return false;

    try {
      await deleteRecommendation({
        spotId: locationId,
      });
      onDeleteStargazeLocation?.(locationId);
      if (editingLocationId && editingLocationId === String(locationId).trim()) {
        resetLocationForm();
      }
      showNotification("Location removed", "info", { duration: 2200 });
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this location right now",
        "failure",
        { duration: 3200 },
      );
      return false;
    }
  };

  const performDeleteEvent = async (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return false;

    try {
      await Promise.resolve(onDeleteStarPartyEvent?.(eventId));
      if (editingEventId && editingEventId === eventId) {
        resetEventForm();
      }
      showNotification("Event removed", "info", { duration: 2200 });
      return true;
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not delete this event right now",
        "failure",
        { duration: 3200 },
      );
      return false;
    }
  };

  const handleRequestDeleteLocation = (location) => {
    const locationId = String(location?.id || "").trim();
    if (!locationId) return;

    const locationName =
      String(location?.name || locationId || "this location").trim() || "this location";

    setPendingDelete({
      kind: "location",
      item: location,
      title: "Delete location?",
      message: `${locationName} will be removed from the curated locations list. This action cannot be undone.`,
      confirmLabel: "Delete location",
    });
  };

  const handleRequestDeleteEvent = (event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId) return;

    const eventTitle =
      String(event?.title || eventId || "this event").trim() || "this event";

    setPendingDelete({
      kind: "event",
      item: event,
      title: "Delete event?",
      message: `${eventTitle} will be removed from the event list. This action cannot be undone.`,
      confirmLabel: "Delete event",
    });
  };

  const handleCancelDelete = () => {
    if (isDeleteConfirmBusy) return;
    setPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeleteConfirmBusy) return;

    setIsDeleteConfirmBusy(true);
    try {
      const didDelete =
        pendingDelete.kind === "location"
          ? await performDeleteLocation(pendingDelete.item)
          : await performDeleteEvent(pendingDelete.item);

      if (didDelete) {
        setPendingDelete(null);
      }
    } finally {
      setIsDeleteConfirmBusy(false);
    }
  };

  const handleSubmitLocation = async (event) => {
    event.preventDefault();
    const location = buildLocationFromDraft(locationDraft);

    const validation = validateLocationDraft(location);
    if (validation) {
      showNotification(validation.message, "failure", { duration: validation.duration });
      return;
    }

    const resolvedId =
      String(locationDraft.id || "").trim() ||
      buildLocationId({
        name: location.name,
        country: location.country,
        region: location.region,
      });
    const apiLocation = buildApiLocation(location, resolvedId);

    try {
      await saveRecommendation({
        location: apiLocation,
      });
      onSaveStargazeLocation?.(apiLocation);
      showNotification(
        isEditingLocation ? "Location updated" : "Location added",
        "success",
        { duration: 2400 },
      );
      resetLocationForm();
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not save this location right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSubmitEvent = async (event) => {
    event.preventDefault();
    const eventData = buildEventFromDraft(eventDraft);

    const validation = validateEventDraft(eventData);
    if (validation) {
      showNotification(validation.message, "failure", { duration: validation.duration });
      return;
    }

    const resolvedId =
      eventData.id ||
      buildEventId({ title: eventData.title, startsAt: eventData.startsAt });
    const payload = {
      ...eventData,
      id: resolvedId,
    };

    try {
      await Promise.resolve(onSaveStarPartyEvent?.(payload));
      showNotification(isEditingEvent ? "Event updated" : "Event created", "success", {
        duration: 2400,
      });
      resetEventForm();
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not save this event right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleSetEventStatus = async (eventId, status) => {
    if (!eventId || !status) return;
    try {
      await Promise.resolve(onSetStarPartyEventStatus?.({ eventId, status }));
      if (editingEventId && editingEventId === String(eventId).trim()) {
        setEventDraft((current) => ({ ...current, status }));
      }
      showNotification(`Event status set to ${status}`, "info", { duration: 1800 });
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not change event status right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  const handleToggleUserAdmin = async (user) => {
    const userId = String(user?.id || "").trim();
    if (!userId || userId === currentUserId) return;

    const nextIsAdmin = !user?.isAdmin;
    const targetLabel =
      String(user?.displayName || user?.name || user?.email || "User").trim() || "User";

    try {
      await saveUserAccess({
        userId,
        isAdmin: nextIsAdmin,
        role: nextIsAdmin ? "admin" : "user",
      });
      showNotification(
        nextIsAdmin
          ? `${targetLabel} now has admin access`
          : `Admin access removed from ${targetLabel}`,
        "success",
        { duration: 2400 },
      );
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "Could not update user access right now",
        "failure",
        { duration: 3200 },
      );
    }
  };

  return {
    locationDraft,
    eventDraft,
    editingLocationId,
    editingEventId,
    isEditingLocation,
    isEditingEvent,
    pendingDelete,
    isDeleteConfirmBusy,
    handleLocationFieldChange,
    handleEventFieldChange,
    resetLocationForm,
    resetEventForm,
    handleEditLocation,
    handleEditEvent,
    handleRequestDeleteLocation,
    handleRequestDeleteEvent,
    handleCancelDelete,
    handleConfirmDelete,
    handleSubmitLocation,
    handleSubmitEvent,
    handleSetEventStatus,
    handleToggleUserAdmin,
  };
}
