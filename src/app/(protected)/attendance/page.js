"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export default function AttendancePage() {
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [batchId, setBatchId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [statusMap, setStatusMap] = useState({}); // { [studentId]: true/false }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // load batches + subjects
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

  // load students when batch changes
  useEffect(() => {
    if (!batchId) {
      setStudents([]);
      setStatusMap({});
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/meta/students?batch_id=${batchId}`, { credentials: "include" });
        const data = await res.json().catch(() => []);
        setStudents(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId]);

  // load saved attendance for date+batch+subject
  useEffect(() => {
    if (!date || !batchId || !subjectId) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/attendance?date=${date}&batch_id=${batchId}&subject_id=${subjectId}`,
          { credentials: "include" }
        );

        const rows = await res.json().catch(() => []);
        const map = {};
        if (Array.isArray(rows)) {
          for (const r of rows) map[String(r.student_id)] = !!r.status;
        }

        // ensure all students have a value (default false)
        const merged = {};
        for (const st of students) {
          merged[String(st.id)] = map[String(st.id)] || false;
        }
        setStatusMap(merged);
      } catch (e) {
        setError("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    })();
  }, [date, batchId, subjectId, students]);

  const canSave = useMemo(() => !!date && !!batchId && !!subjectId && students.length > 0, [
    date,
    batchId,
    subjectId,
    students,
  ]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const records = students.map((st) => ({
        student_id: st.id,
        status: !!statusMap[String(st.id)],
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date,
          batch_id: Number(batchId),
          subject_id: Number(subjectId),
          records,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Save failed");

      setSuccess("Attendance saved ✅");
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" subtitle="Mark attendance for your batch and subject" />

      <Card>
        <CardContent className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <div className="grid gap-3 md:grid-cols-4">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select
              label="Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              options={[
                { value: "", label: "Select batch" },
                ...batches.map((b) => ({ value: String(b.id), label: b.name })),
              ]}
            />
            <Select
              label="Subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              options={[
                { value: "", label: "Select subject" },
                ...subjects.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" onClick={save} disabled={!canSave || saving}>
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Saving...
                  </span>
                ) : (
                  "Save Attendance"
                )}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading...
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2">Student</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Present</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id} className="border-b">
                    <td className="py-2 font-medium">{st.name}</td>
                    <td className="py-2 text-slate-600">{st.email}</td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!statusMap[String(st.id)]}
                        onChange={(e) =>
                          setStatusMap((prev) => ({ ...prev, [String(st.id)]: e.target.checked }))
                        }
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500">
                      Select a batch to load students
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
