import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { HistoryPage } from "@/features/history/pages/HistoryPage";
import { LuckyPickPage } from "@/features/lucky-pick/pages/LuckyPickPage";
import { AnalysisPage } from "@/features/analysis/pages/AnalysisPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { SettingsPage } from "@/features/admin/pages/SettingsPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, type ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="lucky-pick" element={<LuckyPickPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
