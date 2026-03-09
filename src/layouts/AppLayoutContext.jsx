import { createContext, useContext } from "react";

export const AppLayoutContext = createContext(null);

export const useAppLayoutContext = () => {
  const context = useContext(AppLayoutContext);
  if (!context) {
    throw new Error("useAppLayoutContext must be used within AppLayout.");
  }
  return context;
};
