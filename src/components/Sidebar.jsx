"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck, ClipboardList, FileText, Users, Layers, BookOpen, BarChart2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

function NavLink({ href, icon: Icon, label, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const role = user?.role || "";

  const links = (() => {
    if (role === "admin") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/admin/lecturers", label: "Lecturers", icon: Users },
        { href: "/admin/batches", label: "Batches", icon: Layers },
        { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
      ];
    }

    if (role === "lecturer") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: Home },
        { href: "/lecturer/students", label: "Students", icon: Users },
        { href: "/attendance", label: "Attendance", icon: CalendarCheck },
        { href: "/marks", label: "Marks", icon: ClipboardList },
        { href: "/reports", label: "Reports", icon: FileText },
      ];
    }

    // student
    return [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/student", label: "My Performance", icon: BarChart2 },
    ];
  })();

  return (
    <aside className="hidden w-64 flex-col border-r bg-white p-4 md:flex">
      <div className="mb-5">
        <div className="text-lg font-bold text-slate-900">Smart Attendance</div>
        <div className="text-xs text-slate-500">Role: {role || "-"}</div>
      </div>

      <nav className="space-y-1">
        {links.map((l) => (
          <NavLink key={l.href} {...l} active={pathname.startsWith(l.href)} />
        ))}
      </nav>
    </aside>
  );
}
