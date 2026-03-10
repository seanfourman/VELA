import { useEffect, useMemo } from "react";

const OWNER_COUNT_ATTR = "data-portal-owner-count";

const readOwnerCount = (element) => {
  if (!element) return 0;
  return Number(element.getAttribute(OWNER_COUNT_ATTR) || "0");
};

const resolvePortalTarget = (id) => {
  if (typeof document === "undefined" || !id) return null;

  const existing = document.getElementById(id);
  if (existing) {
    return existing;
  }

  const element = document.createElement("div");
  element.id = id;
  return element;
};

export default function usePortalTarget(id) {
  const portalTarget = useMemo(() => resolvePortalTarget(id), [id]);

  useEffect(() => {
    if (typeof document === "undefined" || !id || !portalTarget) return undefined;

    if (!portalTarget.parentNode) {
      document.body.appendChild(portalTarget);
    }

    portalTarget.setAttribute(
      OWNER_COUNT_ATTR,
      String(readOwnerCount(portalTarget) + 1),
    );

    return () => {
      const remainingOwners = Math.max(readOwnerCount(portalTarget) - 1, 0);
      if (remainingOwners > 0) {
        portalTarget.setAttribute(OWNER_COUNT_ATTR, String(remainingOwners));
        return;
      }

      portalTarget.removeAttribute(OWNER_COUNT_ATTR);
      if (portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
      }
    };
  }, [id, portalTarget]);

  return portalTarget;
}
