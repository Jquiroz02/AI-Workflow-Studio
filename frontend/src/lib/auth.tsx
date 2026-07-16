import type { ReactNode } from "react";
// Namespace import, not named destructuring: several tests narrowly mock
// "@clerk/clerk-react" with only the export they exercise (e.g. just
// `useAuth`), and Vitest's mock resolution throws immediately on any
// destructured name absent from the mock - even if it's never used. Reading
// properties off this namespace instead defers that lookup to wherever it's
// actually referenced (inside a function/component body), so an unrelated
// test's narrow mock doesn't break every consumer of this module.
import * as Clerk from "@clerk/clerk-react";

// The exact placeholder shipped in frontend/.env.example. It's structurally
// valid (won't crash ClerkProvider on boot) but points at a Clerk instance
// that doesn't exist, so real auth would otherwise hang forever waiting for
// Clerk to load - see isAuthConfigured below, which everything in this file
// is built around.
export const PLACEHOLDER_CLERK_PUBLISHABLE_KEY =
  "pk_test_ZXhhbXBsZS1jbGVyay1pbnN0YW5jZS5jbGVyay5hY2NvdW50cy5kZXYk";

export function computeIsAuthConfigured(key: string | undefined | null): boolean {
  return Boolean(key) && key !== PLACEHOLDER_CLERK_PUBLISHABLE_KEY;
}

export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export const isAuthConfigured = computeIsAuthConfigured(clerkPublishableKey);

/**
 * Mounts ClerkProvider only when real auth is configured. When it isn't,
 * renders children directly instead of Clerk's hard `throw` on a missing key
 * or an indefinite loading state on an unreachable instance - every other
 * export below falls back to a safe "signed out" shape so the rest of the
 * app (landing page, protected routes, API client) never has to special-case
 * "auth might not exist" itself.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;
  const ClerkProvider = Clerk.ClerkProvider;
  return (
    <ClerkProvider publishableKey={clerkPublishableKey!} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
  getToken: () => Promise<string | null>;
};

function useConfiguredAuth(): AuthState {
  return Clerk.useAuth();
}

function useUnconfiguredAuth(): AuthState {
  return { isLoaded: true, isSignedIn: false, userId: null, getToken: async () => null };
}

// Assigned once at module load from a constant (the env var never changes at
// runtime), not branched on per-render - each side of the branch always
// calls the same hooks in the same order, so this is safe under the rules
// of hooks despite looking conditional.
export const useAuth: () => AuthState = isAuthConfigured ? useConfiguredAuth : useUnconfiguredAuth;

type UserState = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: { primaryEmailAddress?: { emailAddress: string } | null } | null | undefined;
};

function useConfiguredUser(): UserState {
  return Clerk.useUser();
}

function useUnconfiguredUser(): UserState {
  return { isLoaded: true, isSignedIn: false, user: null };
}

export const useUser: () => UserState = isAuthConfigured ? useConfiguredUser : useUnconfiguredUser;

export function SignedIn({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return null;
  const Comp = Clerk.SignedIn;
  return <Comp>{children}</Comp>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;
  const Comp = Clerk.SignedOut;
  return <Comp>{children}</Comp>;
}

export function UserButton(props: { afterSignOutUrl?: string }) {
  if (!isAuthConfigured) return null;
  const Comp = Clerk.UserButton;
  return <Comp {...props} />;
}
