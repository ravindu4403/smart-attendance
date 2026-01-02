"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export default function ReportsPage() {
  const { user } = useAuth();

  // Local month (avoids UTC shifting to previous month around midnight)
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }); // YYYY-MM
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [bRes, sRes] = await Promise.all([
          fetch("/api/meta/batches", { credentials: "include" }),
          fetch("/api/meta/subjects", { credentials: "include" }),
        ]);
        const bData = await bRes.json().catch(() => []);
        const sData = await sRes.json().catch(() => []);
        setBatches(Array.isArray(bData) ? bData : []);
        setSubjects(Array.isArray(sData) ? sData : []);
      } catch (e) {
        setError("Failed to load meta data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lecturerNeedFilters = user?.role === "lecturer";

  const canDownload = useMemo(() => {
    if (!month) return false;
    if (lecturerNeedFilters) return !!batchId && !!subjectId;
    return true;
  }, [month, lecturerNeedFilters, batchId, subjectId]);

  function buildUrl(type) {
    const qs = new URLSearchParams();
    qs.set("month", month);
    if (batchId) qs.set("batch_id", batchId);
    if (subjectId) qs.set("subject_id", subjectId);
    qs.set("format", "csv");
    return `/api/reports/${type}?${qs.toString()}`;
  }

  function download(type) {
    setError("");
    setInfo("");
    if (!canDownload) {
      setError(
        lecturerNeedFilters ? "Select batch + subject first" : "Select month"
      );
      return;
    }
    const url = buildUrl(type);
    window.location.href = url;
    setInfo("Downloading... ✅");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Download Attendance & Marks reports (CSV)"
      />

      <Card>
        <CardContent className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {info ? <Alert variant="success">{info}</Alert> : null}

          <div className="grid gap-3 md:grid-cols-4">
            <Input
              label="Month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Select
              label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              options={[
                { value: "", label: "All / Not selected" },
                ...batches.map((b) => ({ value: String(b.id), label: b.name })),
              ]}
            />
            <Select
              label="Subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              options={[
                { value: "", label: "All / Not selected" },
                ...subjects.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                })),
              ]}
            />
            <div className="flex items-end">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Spinner /> Loading...
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  {lecturerNeedFilters
                    ? "Lecturer: batch + subject required"
                    : "Admin: filters optional"}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => download("attendance")}>
              Download Attendance CSV
            </Button>
            <Button variant="secondary" onClick={() => download("marks")}>
              Download Marks CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
