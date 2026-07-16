import { LayoutDashboard, Moon, Sparkles, Sun, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { useTheme } from "@/context/ThemeContext";
import { UserButton } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 px-5 py-5 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Sparkles className="size-4" />
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100">AI Workflow Studio</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 dark:border-slate-800">
        <UserButton afterSignOutUrl="/" />
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function MobileSidebarOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full w-72 max-w-[80vw]">
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <X className="size-4" />
        </button>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
