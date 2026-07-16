import { SignUp } from "@clerk/clerk-react";

import { AuthNotConfiguredNotice } from "@/components/AuthNotConfiguredNotice";
import { isAuthConfigured } from "@/lib/auth";

export function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      {isAuthConfigured ? <SignUp signInUrl="/sign-in" /> : <AuthNotConfiguredNotice />}
    </div>
  );
}
