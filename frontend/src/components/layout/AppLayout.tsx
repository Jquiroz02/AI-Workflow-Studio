import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";

import { MobileSidebarOverlay, Sidebar } from "@/components/layout/Sidebar";

export function AppLayout() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden w-64 shrink-0 md:block">
        <Sidebar />
      </div>

      <MobileSidebarOverlay isOpen={isMobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-slate-900 dark:text-slate-100">AI Workflow Studio</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
