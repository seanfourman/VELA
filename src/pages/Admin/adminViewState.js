export const ADMIN_VIEWS = ["locations", "events", "users"];
export const ADMIN_PAGE_SIZE = 8;

export const createEmptyAdminViewState = (value = "") =>
  Object.fromEntries(ADMIN_VIEWS.map((view) => [view, value]));

export const normalizeSearchValue = (value) => String(value || "").trim().toLowerCase();

const buildSearchBlob = (values) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

const VIEW_MATCHERS = {
  locations: (location, query) => {
    if (!query) return true;
    return buildSearchBlob([
      location?.name,
      location?.id,
      location?.region,
      location?.country,
      location?.type,
      location?.bestTime,
      location?.description,
      location?.lat,
      location?.lng,
    ]).includes(query);
  },
  events: (event, query) => {
    if (!query) return true;
    return buildSearchBlob([
      event?.title,
      event?.id,
      event?.eventType,
      event?.status,
      event?.description,
      event?.meetupDetails,
      event?.lat,
      event?.lng,
      event?.host?.name,
      event?.host?.email,
      event?.hostChecklist,
    ]).includes(query);
  },
  users: (user, query) => {
    if (!query) return true;
    return buildSearchBlob([
      user?.name,
      user?.displayName,
      user?.email,
      user?.role,
      user?.isAdmin ? "admin" : "user",
      user?.createdAtUtc,
      user?.bio,
    ]).includes(query);
  },
};

export const filterAdminItems = (view, items, query) => {
  const matcher = VIEW_MATCHERS[view];
  if (!matcher) return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter((item) => matcher(item, query));
};

export const paginateItems = (items, page, pageSize = ADMIN_PAGE_SIZE) => {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
};

export const getAdminViewContent = ({
  activeView,
  isEditingLocation,
  isEditingEvent,
}) => {
  const viewCopy = {
    locations: {
      searchLabel: "Search locations",
      searchPlaceholder: "Search locations",
      formTitle: isEditingLocation ? "Edit location" : "Add location",
      formCopy: "Create and update curated stargazing spots.",
      collectionTitle: "Existing locations",
      collectionCopy: "Search, review, and manage curated map spots.",
    },
    events: {
      searchLabel: "Search events",
      searchPlaceholder: "Search events",
      formTitle: isEditingEvent ? "Edit event" : "Create event",
      formCopy: "Create and update star party events.",
      collectionTitle: "Existing events",
      collectionCopy: "Search, review, and manage created events.",
    },
    users: {
      searchLabel: "Search users",
      searchPlaceholder: "Search users",
      formTitle: "User access",
      formCopy: "Grant or remove admin access for other accounts.",
      collectionTitle: "Existing users",
      collectionCopy: "Search, review, and manage user access.",
    },
  };

  return viewCopy[activeView] ?? viewCopy.locations;
};
