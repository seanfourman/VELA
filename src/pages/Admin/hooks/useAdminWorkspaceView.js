import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_VIEWS,
  compareAlphabetical,
  createEmptyAdminViewState,
  filterAdminItems,
  normalizeSearchValue,
  paginateItems,
} from "../adminViewUtils";

export default function useAdminWorkspaceView({
  stargazeLocations,
  starPartyEvents,
  managedUsers,
}) {
  const [activeView, setActiveView] = useState("locations");
  const [searchByView, setSearchByView] = useState(() =>
    createEmptyAdminViewState(""),
  );
  const [pageByView, setPageByView] = useState(() =>
    createEmptyAdminViewState(1),
  );
  const locationPaginationRef = useRef(null);
  const eventPaginationRef = useRef(null);
  const userPaginationRef = useRef(null);
  const pendingPaginationAnchorRef = useRef(null);

  const locationList = useMemo(() => {
    if (!Array.isArray(stargazeLocations)) return [];
    return [...stargazeLocations].sort((a, b) =>
      compareAlphabetical(a?.name, b?.name),
    );
  }, [stargazeLocations]);

  const eventList = useMemo(() => {
    if (!Array.isArray(starPartyEvents)) return [];
    return [...starPartyEvents].sort((a, b) =>
      compareAlphabetical(a?.title, b?.title),
    );
  }, [starPartyEvents]);

  const userList = useMemo(() => {
    if (!Array.isArray(managedUsers)) return [];
    return [...managedUsers].sort((a, b) =>
      compareAlphabetical(
        a?.displayName || a?.name || a?.email,
        b?.displayName || b?.name || b?.email,
      ),
    );
  }, [managedUsers]);

  const listByView = useMemo(
    () => ({
      locations: locationList,
      events: eventList,
      users: userList,
    }),
    [eventList, locationList, userList],
  );

  const normalizedSearchByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          normalizeSearchValue(searchByView[view]),
        ]),
      ),
    [searchByView],
  );

  const filteredByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          filterAdminItems(view, listByView[view], normalizedSearchByView[view]),
        ]),
      ),
    [listByView, normalizedSearchByView],
  );

  const totalPagesByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          Math.max(1, Math.ceil(filteredByView[view].length / ADMIN_PAGE_SIZE)),
        ]),
      ),
    [filteredByView],
  );

  const safePageByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          Math.min(pageByView[view], totalPagesByView[view]),
        ]),
      ),
    [pageByView, totalPagesByView],
  );

  const paginatedByView = useMemo(
    () =>
      Object.fromEntries(
        ADMIN_VIEWS.map((view) => [
          view,
          paginateItems(filteredByView[view], safePageByView[view], ADMIN_PAGE_SIZE),
        ]),
      ),
    [filteredByView, safePageByView],
  );

  const publishedEventsCount = useMemo(
    () => eventList.filter((event) => event.status === "published").length,
    [eventList],
  );
  const adminUsersCount = useMemo(
    () => userList.filter((user) => user.isAdmin).length,
    [userList],
  );
  const totalRsvps = useMemo(
    () =>
      eventList.reduce(
        (sum, event) => sum + (Array.isArray(event.rsvps) ? event.rsvps.length : 0),
        0,
      ),
    [eventList],
  );

  const activeViewIndex = Math.max(0, ADMIN_VIEWS.indexOf(activeView));
  const activeSearchValue = searchByView[activeView];
  const activeFilteredCount = filteredByView[activeView].length;
  const activePage = safePageByView[activeView];
  const activeTotalPages = totalPagesByView[activeView];
  const paginatedLocations = paginatedByView.locations;
  const paginatedEvents = paginatedByView.events;
  const paginatedUsers = paginatedByView.users;
  const visibleStart =
    activeFilteredCount === 0 ? 0 : (activePage - 1) * ADMIN_PAGE_SIZE + 1;
  const visibleEnd =
    activeFilteredCount === 0
      ? 0
      : Math.min(activePage * ADMIN_PAGE_SIZE, activeFilteredCount);
  const activeResultSummary = `${visibleStart}-${visibleEnd} of ${activeFilteredCount}`;
  const viewSwitcherStyle = {
    "--switch-index": activeViewIndex,
    "--switch-count": 3,
  };
  const adminSummaryGroups = useMemo(
    () => [
      {
        id: "locations",
        title: "Locations",
        stats: [{ label: "Spots", value: locationList.length }],
      },
      {
        id: "events",
        title: "Events",
        stats: [
          { label: "Total", value: eventList.length },
          { label: "Published", value: publishedEventsCount },
          { label: "RSVPs", value: totalRsvps },
        ],
      },
      {
        id: "users",
        title: "Users",
        stats: [
          { label: "Accounts", value: userList.length },
          { label: "Admins", value: adminUsersCount },
        ],
      },
    ],
    [
      adminUsersCount,
      eventList.length,
      locationList.length,
      publishedEventsCount,
      totalRsvps,
      userList.length,
    ],
  );

  useEffect(() => {
    const pendingView = pendingPaginationAnchorRef.current;
    if (!pendingView || typeof window === "undefined") return undefined;

    const paginationNode =
      pendingView === "events"
        ? eventPaginationRef.current
        : pendingView === "users"
          ? userPaginationRef.current
          : locationPaginationRef.current;

    if (!paginationNode) {
      pendingPaginationAnchorRef.current = null;
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const scrollContainer = paginationNode.closest(".profile-page");

      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
        });
      } else {
        paginationNode.scrollIntoView({
          block: "end",
          inline: "nearest",
        });
      }

      pendingPaginationAnchorRef.current = null;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [safePageByView]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchByView((current) => ({ ...current, [activeView]: value }));
    setPageByView((current) => ({ ...current, [activeView]: 1 }));
  };

  const handlePreviousPage = () => {
    pendingPaginationAnchorRef.current = activeView;
    setPageByView((current) => ({
      ...current,
      [activeView]: Math.max(Math.min(current[activeView], activeTotalPages) - 1, 1),
    }));
  };

  const handleNextPage = () => {
    pendingPaginationAnchorRef.current = activeView;
    setPageByView((current) => ({
      ...current,
      [activeView]: Math.min(
        Math.min(current[activeView], activeTotalPages) + 1,
        activeTotalPages,
      ),
    }));
  };

  return {
    activeView,
    setActiveView,
    normalizedSearchByView,
    activeSearchValue,
    activePage,
    activeTotalPages,
    activeResultSummary,
    viewSwitcherStyle,
    adminSummaryGroups,
    paginatedLocations,
    paginatedEvents,
    paginatedUsers,
    userList,
    locationPaginationRef,
    eventPaginationRef,
    userPaginationRef,
    handleSearchChange,
    handlePreviousPage,
    handleNextPage,
  };
}
