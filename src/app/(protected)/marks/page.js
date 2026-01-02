"use client";

import { useEffect, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export default function MarksPage() {
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [recent, setRecent] = useState([]);

  const [batchId, setBatchId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [examType, setExamType] = useState("Mid");
  const [score, setScore] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // load students for selected batch
  useEffect(() => {
    if (!batchId) {
      setStudents([]);
      setStudentId("");
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

  async function loadRecent() {
    try {
      const qs = new URLSearchParams();
      if (batchId) qs.set("batch_id", batchId);
      if (subjectId) qs.set("subject_id", subjectId);
      if (studentId) qs.set("student_id", studentId);

      const res = await fetch(`/api/marks?${qs.toString()}`, { credentials: "include" });
      const data = await res.json().catch(() => []);
      if (res.ok) setRecent(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch {}
  }

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, subjectId, studentId]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          batch_id: Number(batchId),
          student_id: Number(studentId),
          subject_id: Number(subjectId),
          exam_type: examType,
          score: Number(score),
          date,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Save failed");

      setSuccess("Marks saved ✅");
      setScore("");
      await loadRecent();
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!batchId && !!subjectId && !!studentId && score !== "" && !!date;

  return (
    <div className="space-y-5">
      <PageHeader title="Marks" subtitle="Enter marks for students" />

      <Card>
        <CardContent className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <div className="grid gap-3 md:grid-cols-6">
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
            <Select
              label="Student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: "", label: "Select student" },
                ...students.map((st) => ({ value: String(st.id), label: st.name })),
              ]}
            />
            <Select
              label="Exam Type"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              options={[
                { value: "Quiz", label: "Quiz" },
                { value: "Mid", label: "Mid" },
                { value: "Final", label: "Final" },
              ]}
            />
            <Input label="Score" type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!canSave || saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Saving...
                </span>
              ) : (
                "Save Marks"
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading...
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="mb-2 text-sm font-semibold text-slate-900">Recent Marks</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2">Student</th>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Exam</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 font-medium">{r.student_name || r.student_id}</td>
                    <td className="py-2">{r.batch_name || r.batch_id}</td>
                    <td className="py-2">{r.subject_name || r.subject_id}</td>
                    <td className="py-2">{r.exam_type}</td>
                    <td className="py-2">{r.score}</td>
                    <td className="py-2">{String(r.date).slice(0, 10)}</td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      No marks found
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
