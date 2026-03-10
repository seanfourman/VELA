import { createPortal } from "react-dom";
import { useEffect, useId, useRef } from "react";
import usePortalTarget from "@/hooks/usePortalTarget";
import "./styles/ConfirmDialog.css";

export default function ConfirmDialog({
  open = false,
  title = "Confirm action",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  const portalTarget = usePortalTarget("confirm-dialog-root");
  const titleId = useId();
  const messageId = useId();
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";

    const frameId = window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isBusy) {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [isBusy, onCancel, open]);

  if (!portalTarget) return null;

  return createPortal(
    <div
      className={`confirm-dialog-root${open ? " is-open" : " is-closed"}`}
      role="presentation"
    >
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label="Close confirmation dialog"
        tabIndex={open ? 0 : -1}
        onClick={() => {
          if (!isBusy) onCancel?.();
        }}
      />
      <div className="confirm-dialog-shell">
        <div
          className="confirm-dialog glass-panel glass-panel-elevated"
          role={open ? "dialog" : undefined}
          aria-modal={open ? "true" : undefined}
          aria-hidden={!open}
          aria-labelledby={open ? titleId : undefined}
          aria-describedby={open ? messageId : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="confirm-dialog__eyebrow">Confirm deletion</div>
          <div className="confirm-dialog__body">
            <h2 id={titleId} className="confirm-dialog__title">
              {title}
            </h2>
            <p id={messageId} className="confirm-dialog__message">
              {message}
            </p>
          </div>
          <div className="confirm-dialog__actions">
            <button
              type="button"
              className="glass-btn profile-action-btn profile-secondary"
              onClick={onCancel}
              disabled={isBusy}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              className="glass-btn profile-action-btn confirm-dialog__confirm"
              onClick={onConfirm}
              disabled={isBusy}
            >
              {isBusy ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
