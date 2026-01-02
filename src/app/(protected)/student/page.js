"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

import { useAuth } from "@/components/auth/AuthProvider";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export default function StudentPage() {
  const { user } = useAuth();

  const attCanvas = useRef(null);
  const marksCanvas = useRef(null);
  const attChartRef = useRef(null);
  const marksChartRef = useRef(null);

  const [attSummary, setAttSummary] = useState({ present: 0, total: 0 });
  const [marksList, setMarksList] = useState([]);
  const [attDetails, setAttDetails] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMsg("");
      try {
        const [aRes, mRes, dRes] = await Promise.all([
          fetch("/api/student/attendance", { credentials: "include" }),
          fetch("/api/marks", { credentials: "include" }),
          fetch("/api/student/attendance-details?limit=50", {
            credentials: "include",
          }),
        ]);

        const [aData, mData, dData] = await Promise.all([
          aRes.json().catch(() => ({})),
          mRes.json().catch(() => []),
          dRes.json().catch(() => []),
        ]);

        if (!aRes.ok) throw new Error(aData?.message || "Attendance load failed");
        if (!mRes.ok) throw new Error(mData?.message || "Marks load failed");
        if (!dRes.ok) throw new Error(dData?.message || "Attendance details load failed");

        setAttSummary({ present: aData.present || 0, total: aData.total || 0 });
        setMarksList(Array.isArray(mData) ? mData : []);
        setAttDetails(Array.isArray(dData) ? dData : []);

        // Destroy old charts
        if (attChartRef.current) attChartRef.current.destroy();
        if (marksChartRef.current) marksChartRef.current.destroy();

        // Attendance chart
        attChartRef.current = new Chart(attCanvas.current, {
          type: "bar",
          data: {
            labels: ["Present", "Absent"],
            datasets: [
              {
                label: "Days",
                data: [
                  aData.present || 0,
                  (aData.total || 0) - (aData.present || 0),
                ],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });

        // Marks chart
        marksChartRef.current = new Chart(marksCanvas.current, {
          type: "line",
          data: {
            labels: (mData || []).map((x) => `${x.subject_name || x.subject || "-"} - ${x.exam_type}`),
            datasets: [
              {
                label: "Score",
                data: (mData || []).map((x) => x.score),
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });
      } catch (e) {
        setMsg(e?.message || "Error loading charts");
      }
      setLoading(false);
    }

    load();
    return () => {
      if (attChartRef.current) attChartRef.current.destroy();
      if (marksChartRef.current) marksChartRef.current.destroy();
    };
  }, []);

  const absent = Math.max(attSummary.total - attSummary.present, 0);
  const percent = attSummary.total === 0 ? 0 : Math.round((attSummary.present / attSummary.total) * 100);

  return (
    <div>
      <PageHeader
        title="Student Dashboard"
        description={`Welcome, ${user?.name}. View your attendance and marks performance.`}
      />

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <Spinner size={18} /> Loading data...
        </div>
      )}

      {msg && (
        <div className="mb-4">
          <Alert variant="error">{msg}</Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-semibold">{attSummary.present}</div>
                <div className="mt-1 text-xs text-slate-500">Present</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-semibold">{absent}</div>
                <div className="mt-1 text-xs text-slate-500">Absent</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-2xl font-semibold">{percent}%</div>
                <div className="mt-1 text-xs text-slate-500">Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <canvas ref={attCanvas} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Day</th>
                    <th className="px-4 py-3 text-left font-medium">Subject</th>
                    <th className="px-4 py-3 text-left font-medium">Lecturer</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attDetails.map((r) => {
                    const dateStr = String(r.date).slice(0, 10);
                    const dayStr = new Date(`${dateStr}T00:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short" }
                    );
                    return (
                      <tr key={r.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{dateStr}</td>
                        <td className="px-4 py-3">{dayStr}</td>
                        <td className="px-4 py-3">{r.subject_name || "-"}</td>
                        <td className="px-4 py-3">{r.lecturer_name || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {r.status ? (
                            <Badge variant="success">Present</Badge>
                          ) : (
                            <Badge variant="danger">Absent</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {attDetails.length === 0 && (
              <div className="mt-4 text-sm text-slate-600">
                No attendance records found yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marks Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <canvas ref={marksCanvas} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marks History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Subject</th>
                    <th className="px-4 py-3 text-left font-medium">Exam</th>
                    <th className="px-4 py-3 text-center font-medium">Score</th>
                    <th className="px-4 py-3 text-center font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {marksList.map((m) => (
                    <tr key={m.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{m.subject_name || m.subject || "-"}</td>
                      <td className="px-4 py-3">{m.exam_type}</td>
                      <td className="px-4 py-3 text-center">{m.score}</td>
                      <td className="px-4 py-3 text-center">{String(m.date).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {marksList.length === 0 && (
              <div className="mt-4 text-sm text-slate-600">No marks found yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
