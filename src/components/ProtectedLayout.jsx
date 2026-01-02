"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";

function Shell({ children }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null; // redirected

  return (
    <div className="min-h-screen md:flex">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onLogout={logout} />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
