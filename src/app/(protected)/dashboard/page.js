"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    attendanceTotal: 0,
    attendancePresent: 0,
    marksCount: 0,
    subjectsCount: 0,
    batchesCount: 0,
    lecturersCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (user.role === "student") {
          const [aRes, mRes] = await Promise.all([
            fetch("/api/student/attendance", { credentials: "include" }),
            fetch("/api/marks", { credentials: "include" }),
          ]);

          const [aData, mData] = await Promise.all([
            aRes.json().catch(() => ({})),
            mRes.json().catch(() => []),
          ]);

          setStats({
            attendanceTotal: aData?.total || 0,
            attendancePresent: aData?.present || 0,
            marksCount: Array.isArray(mData) ? mData.length : 0,
          });
        } else if (user.role === "lecturer") {
          // lecturer: show student rows count in monthly reports
          // Use local month (avoids UTC shifting to previous month around midnight)
          const now = new Date();
          const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const [attRes, marksRes] = await Promise.all([
            fetch(`/api/reports/attendance?month=${month}`, { credentials: "include" }),
            fetch(`/api/reports/marks?month=${month}`, { credentials: "include" }),
          ]);

          const [att, marks] = await Promise.all([
            attRes.json().catch(() => []),
            marksRes.json().catch(() => []),
          ]);

          setStats((prev) => ({
            ...prev,
            attendanceTotal: Array.isArray(att) ? att.length : 0,
            attendancePresent: 0,
            marksCount: Array.isArray(marks) ? marks.length : 0,
          }));
        } else if (user.role === "admin") {
          // admin: setup-only (subjects, batches, lecturers)
          const [sRes, bRes, lRes] = await Promise.all([
            fetch("/api/admin/subjects", { credentials: "include" }),
            fetch("/api/admin/batches", { credentials: "include" }),
            fetch("/api/admin/users?role=lecturer", { credentials: "include" }),
          ]);

          const [subjects, batches, lecturers] = await Promise.all([
            sRes.json().catch(() => []),
            bRes.json().catch(() => []),
            lRes.json().catch(() => []),
          ]);

          setStats((prev) => ({
            ...prev,
            subjectsCount: Array.isArray(subjects) ? subjects.length : 0,
            batchesCount: Array.isArray(batches) ? batches.length : 0,
            lecturersCount: Array.isArray(lecturers) ? lecturers.length : 0,
            attendanceTotal: 0,
            attendancePresent: 0,
            marksCount: 0,
          }));
        }
      } catch {
        setStats({
          attendanceTotal: 0,
          attendancePresent: 0,
          marksCount: 0,
          subjectsCount: 0,
          batchesCount: 0,
          lecturersCount: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.role]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Quick access to attendance, marks, reports, and performance"
      >
        {user.role === "student" ? (
          <Link href="/student">
            <Button size="sm">Open My Performance</Button>
          </Link>
        ) : user.role === "lecturer" ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/lecturer/students">
              <Button size="sm">My Students</Button>
            </Link>
            <Link href="/attendance">
              <Button size="sm" variant="secondary">
                Mark Attendance
              </Button>
            </Link>
            <Link href="/marks">
              <Button size="sm" variant="secondary">
                Manage Marks
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/subjects">
              <Button size="sm">Subjects</Button>
            </Link>
            <Link href="/admin/batches">
              <Button size="sm" variant="secondary">
                Batches
              </Button>
            </Link>
            <Link href="/admin/lecturers">
              <Button size="sm" variant="secondary">
                Lecturers
              </Button>
            </Link>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Account
              <Badge
                variant={
                  user.role === "admin"
                    ? "success"
                    : user.role === "lecturer"
                    ? "warning"
                    : "default"
                }
              >
                {user.role}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-sm text-slate-600">Name</div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-slate-600">Email</div>
            <div className="font-medium">{user.email}</div>
          </CardContent>
        </Card>

        {user.role === "admin" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner /> Loading...
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{stats.subjectsCount}</div>
                    <div className="mt-1 text-sm text-slate-500">Active subjects</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Batches</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner /> Loading...
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{stats.batchesCount}</div>
                    <div className="mt-1 text-sm text-slate-500">Active batches</div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner /> Loading...
                  </div>
                ) : user.role === "student" ? (
                  <>
                    <div className="text-3xl font-bold">
                      {stats.attendancePresent}/{stats.attendanceTotal}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">Present / Total</div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{stats.attendanceTotal}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Students in report list (this month)
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Marks</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Spinner /> Loading...
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{stats.marksCount}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {user.role === "student"
                        ? "Your marks entries"
                        : "Students in report list (this month)"}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
