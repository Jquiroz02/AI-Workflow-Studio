import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <p className="text-6xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Page not found</p>
      <Link to="/">
        <Button variant="secondary" size="sm" className="mt-2">
          Back home
        </Button>
      </Link>
    </div>
  );
}
