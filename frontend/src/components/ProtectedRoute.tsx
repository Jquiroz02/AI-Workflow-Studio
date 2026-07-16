import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <PageSpinner label="Loading your workspace..." />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
