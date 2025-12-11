import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { POPUP_EVENT } from "../utils/popup";
import "./Popup.css";

function Popup({ popup }) {
  return (
    <div className={`popup-toast ${popup.type} ${popup.show ? "show" : ""}`}>
      {popup.message}
    </div>
  );
}

export default function PopupPortal() {
  const [popups, setPopups] = useState([]);
  const portalTarget = useMemo(() => {
    let el = document.getElementById("popup-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "popup-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const { message, type = "info", duration = 2500 } = event.detail || {};
      if (!message) return;

      const id = crypto.randomUUID?.() || Date.now().toString();
      const popup = { id, message, type, show: false };
      setPopups((prev) => [...prev, popup]);

      // Animate in on next tick
      setTimeout(() => {
        setPopups((prev) =>
          prev.map((p) => (p.id === id ? { ...p, show: true } : p))
        );
      }, 10);

      // Schedule hide + removal
      setTimeout(() => {
        setPopups((prev) =>
          prev.map((p) => (p.id === id ? { ...p, show: false } : p))
        );
        setTimeout(() => {
          setPopups((prev) => prev.filter((p) => p.id !== id));
        }, 400);
      }, duration);
    };

    window.addEventListener(POPUP_EVENT, handler);
    return () => window.removeEventListener(POPUP_EVENT, handler);
  }, []);

  if (!portalTarget) return null;
  return createPortal(
    <div className="popup-container">
      {popups.map((popup) => (
        <Popup key={popup.id} popup={popup} />
      ))}
    </div>,
    portalTarget
  );
}
