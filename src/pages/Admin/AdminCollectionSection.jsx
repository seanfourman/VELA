const PaginationChevron = ({ direction }) => (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={direction === "left" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AdminCollectionSection({
  title,
  copy,
  searchLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  paginationRef,
  resultSummary,
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
}) {
  return (
    <div className="admin-panel-section admin-panel-section--collection">
      <div className="admin-panel-section__header">
        <div className="admin-panel-section__intro">
          <h3 className="admin-panel-section__title">{title}</h3>
          <p className="admin-panel-section__copy">{copy}</p>
        </div>
        <div className="admin-collection-tools">
          <label className="profile-field admin-search-field">
            <input
              className="profile-input"
              type="search"
              aria-label={searchLabel}
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </label>
        </div>
      </div>

      {children}

      <div className="admin-pagination" ref={paginationRef}>
        <div className="admin-pagination-status">{resultSummary}</div>
        {totalPages > 1 ? (
          <>
            <button
              type="button"
              className="glass-btn profile-action-btn admin-pagination-btn"
              onClick={onPreviousPage}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <PaginationChevron direction="left" />
            </button>
            <button
              type="button"
              className="glass-btn profile-action-btn admin-pagination-btn"
              onClick={onNextPage}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <PaginationChevron direction="right" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
