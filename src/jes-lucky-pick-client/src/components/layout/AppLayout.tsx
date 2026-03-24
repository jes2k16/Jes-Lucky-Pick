import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  History,
  Sparkles,
  BarChart3,
  Shield,
  LogOut,
  Moon,
  Sun,
  ChevronsUpDown,
  User,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { setAccessToken } from "@/lib/api-client";
import apiClient from "@/lib/api-client";
import { fetchDashboardStats } from "@/features/dashboard/api/dashboardApi";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, statKey: null },
  { to: "/history", label: "History", icon: History, statKey: "totalDraws" as const },
  { to: "/lucky-pick", label: "Lucky Pick", icon: Sparkles, statKey: null },
  { to: "/analysis", label: "Analysis", icon: BarChart3, statKey: "mostFrequentNumber" as const },
];

type StatKey = "totalDraws" | "mostFrequentNumber";

function getInitialSidebarOpen(): boolean {
  if (typeof document === "undefined") return true;
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("sidebar_state="));
  if (cookie) return cookie.split("=")[1] === "true";
  return true;
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
  });

  const getStatBadge = (statKey: StatKey | null) => {
    if (!statKey || !stats) return null;
    if (statKey === "totalDraws") return stats.totalDraws.toLocaleString();
    if (statKey === "mostFrequentNumber") return `#${stats.mostFrequentNumber}`;
    return null;
  };

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
    <SidebarProvider defaultOpen={getInitialSidebarOpen()}>
      <Sidebar collapsible="icon">
        {/* Header — Logo */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <NavLink to="/dashboard">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Jes Lucky Pick</span>
                    <span className="truncate text-xs text-muted-foreground">
                      PCSO 6/42
                    </span>
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ to, label, icon: Icon, statKey }) => {
                  const badge = getStatBadge(statKey);
                  const isActive = location.pathname === to;
                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={label}
                      >
                        <NavLink to={to}>
                          <Icon />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}

                {user?.role === "Admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === "/admin"}
                        tooltip="Admin"
                      >
                        <NavLink to="/admin">
                          <Shield />
                          <span>Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === "/admin/settings"}
                        tooltip="Settings"
                      >
                        <NavLink to="/admin/settings">
                          <Settings />
                          <span>Settings</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Secondary — Theme toggle */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={toggleTheme}
                    tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
                  >
                    {theme === "dark" ? <Sun /> : <Moon />}
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer — User */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={user?.username ?? "User"}
                  >
                    {user?.profilePictureBase64 ? (
                      <img
                        src={user.profilePictureBase64}
                        alt="Avatar"
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                        <span className="text-xs font-semibold">
                          {user?.username?.charAt(0).toUpperCase() ?? "U"}
                        </span>
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.username}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                  align="start"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
