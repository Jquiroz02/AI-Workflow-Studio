import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function AuthNotConfiguredNotice() {
  return (
    <div className="w-full max-w-sm">
      <EmptyState
        icon={KeyRound}
        title="Sign-in isn't configured yet"
        description="This deployment doesn't have a real Clerk publishable key set, so accounts can't be created or signed into right now. Explore the demo instead, or set VITE_CLERK_PUBLISHABLE_KEY to enable real sign-in."
        action={
          <Link to="/demo">
            <Button size="sm">View demo</Button>
          </Link>
        }
      />
    </div>
  );
}
