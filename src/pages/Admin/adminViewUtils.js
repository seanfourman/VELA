export const ADMIN_VIEWS = ["locations", "events", "users"];
export const ADMIN_PAGE_SIZE = 8;

export const compareAlphabetical = (left, right) =>
  String(left || "").trim().localeCompare(String(right || "").trim(), undefined, {
    sensitivity: "base",
    numeric: true,
  });

export const createEmptyAdminViewState = (value = "") =>
  Object.fromEntries(ADMIN_VIEWS.map((view) => [view, value]));

export const normalizeSearchValue = (value) =>
  String(value || "").trim().toLowerCase();

export const buildSearchBlob = (values) =>
  values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

export const filterAdminItems = (view, items, query) => {
  const safeItems = Array.isArray(items) ? items : [];
  if (!query) return safeItems;

  return safeItems.filter((item) => {
    if (view === "events") {
      return buildSearchBlob([
        item?.title,
        item?.id,
        item?.eventType,
        item?.status,
        item?.description,
        item?.meetupDetails,
        item?.lat,
        item?.lng,
        item?.host?.name,
        item?.host?.email,
        item?.hostChecklist,
      ]).includes(query);
    }

    if (view === "users") {
      return buildSearchBlob([
        item?.name,
        item?.displayName,
        item?.email,
        item?.role,
        item?.isAdmin ? "admin" : "user",
        item?.createdAtUtc,
        item?.bio,
      ]).includes(query);
    }

    return buildSearchBlob([
      item?.name,
      item?.id,
      item?.region,
      item?.country,
      item?.type,
      item?.bestTime,
      item?.description,
      item?.lat,
      item?.lng,
    ]).includes(query);
  });
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
  if (activeView === "events") {
    return {
      searchLabel: "Search events",
      searchPlaceholder: "Search events",
      formTitle: isEditingEvent ? "Edit event" : "Create event",
      formCopy: "Create and update star party events.",
      collectionTitle: "Existing events",
      collectionCopy: "Search, review, and manage created events.",
    };
  }

  if (activeView === "users") {
    return {
      searchLabel: "Search users",
      searchPlaceholder: "Search users",
      formTitle: "User access",
      formCopy: "Grant or remove admin access for other accounts.",
      collectionTitle: "Existing users",
      collectionCopy: "Search, review, and manage user access.",
    };
  }

  return {
    searchLabel: "Search locations",
    searchPlaceholder: "Search locations",
    formTitle: isEditingLocation ? "Edit location" : "Add location",
    formCopy: "Create and update curated stargazing spots.",
    collectionTitle: "Existing locations",
    collectionCopy: "Search, review, and manage curated map spots.",
  };
};
