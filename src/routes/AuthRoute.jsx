import { useEffect } from "react";
import AuthPage from "@/pages/Auth/AuthPage";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function AuthRoute() {
  const { auth, isLight, navigate, setIsThreeDModeActive } = useAppLayoutContext();

  useEffect(() => {
    setIsThreeDModeActive(false);
  }, [setIsThreeDModeActive]);

  return <AuthPage auth={auth} isLight={isLight} onNavigate={navigate} />;
}

export default AuthRoute;
