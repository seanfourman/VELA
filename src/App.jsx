import { RouterProvider } from "react-router-dom";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import { router } from "./router";
import "./styles/app/App.css";

function App() {
  return (
    <NotificationProvider>
      <RouterProvider router={router} />
    </NotificationProvider>
  );
}

export default App;
