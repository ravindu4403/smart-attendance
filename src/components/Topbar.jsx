"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function Topbar({ user, onLogout }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="md:hidden">
        <Link href="/dashboard" className="text-sm font-semibold">
          Smart Attendance
        </Link>
      </div>
      <div className="hidden md:block">
        <div className="text-sm text-slate-500">Signed in as</div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{user?.name}</div>
          <Badge variant={user?.role === "admin" ? "success" : user?.role === "lecturer" ? "warning" : "default"}>
            {user?.role}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
