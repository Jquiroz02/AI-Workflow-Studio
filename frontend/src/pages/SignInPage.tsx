import { SignIn } from "@clerk/clerk-react";

import { AuthNotConfiguredNotice } from "@/components/AuthNotConfiguredNotice";
import { isAuthConfigured } from "@/lib/auth";

export function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      {isAuthConfigured ? (
        <SignIn signUpUrl="/sign-up" afterSignOutUrl="/" />
      ) : (
        <AuthNotConfiguredNotice />
      )}
    </div>
  );
}
