const validationError = (message, duration) => ({ message, duration });

export const buildApiLocation = (location, id) => ({
  id,
  name: location.name,
  lat: location.lat,
  lng: location.lng,
  description: location.description,
  country: location.country,
  region: location.region,
  type: location.type,
  best_time: location.bestTime,
  photo_urls: location.photoUrls,
  source_urls: location.sourceUrls,
});

export const validateLocationDraft = (location) => {
  if (!location.name) {
    return validationError("Name is required", 2400);
  }

  if (!Number.isFinite(location.lat) || location.lat < -90 || location.lat > 90) {
    return validationError("Latitude must be between -90 and 90", 2800);
  }

  if (!Number.isFinite(location.lng) || location.lng < -180 || location.lng > 180) {
    return validationError("Longitude must be between -180 and 180", 2800);
  }

  const invalidPhotoCount = location.invalidPhotoUrls.length;
  const invalidSourceCount = location.invalidSourceUrls.length;
  if (invalidPhotoCount > 0 || invalidSourceCount > 0) {
    const details = [];
    if (invalidPhotoCount > 0) {
      details.push(`photo URLs: ${invalidPhotoCount}`);
    }
    if (invalidSourceCount > 0) {
      details.push(`source URLs: ${invalidSourceCount}`);
    }
    return validationError(
      `Invalid URL list (${details.join(", ")}). Use valid http(s) URLs only`,
      4200,
    );
  }

  return null;
};

export const validateEventDraft = (eventData) => {
  if (!eventData.title) {
    return validationError("Event title is required", 2400);
  }

  if (!eventData.startsAt) {
    return validationError("Event start date and time are required", 2400);
  }

  if (!Number.isFinite(eventData.lat) || eventData.lat < -90 || eventData.lat > 90) {
    return validationError("Latitude must be between -90 and 90", 2800);
  }

  if (!Number.isFinite(eventData.lng) || eventData.lng < -180 || eventData.lng > 180) {
    return validationError("Longitude must be between -180 and 180", 2800);
  }

  if (eventData.endsAt) {
    const startMs = Date.parse(eventData.startsAt);
    const endMs = Date.parse(eventData.endsAt);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
      return validationError("Event end time must be after start time", 2800);
    }
  }

  return null;
};
