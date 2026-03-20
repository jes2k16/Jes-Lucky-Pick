import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md p-4">{children}</div>
    </div>
  );
}
