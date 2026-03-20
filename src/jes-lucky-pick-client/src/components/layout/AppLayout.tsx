import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  History,
  Sparkles,
  BarChart3,
  Shield,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { setAccessToken } from "@/lib/api-client";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "History", icon: History },
  { to: "/lucky-pick", label: "Lucky Pick", icon: Sparkles },
  { to: "/analysis", label: "Analysis", icon: BarChart3 },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            Jes Lucky Pick
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PCSO 6/42 Predictor
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}

          {user?.role === "Admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )
              }
            >
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.username}
            </span>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
