"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export default function LecturerStudentsPage() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [students, setStudents] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/meta/batches", {
          credentials: "include",
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.message || "Failed to load batches");
        setBatches(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadStudents(bid) {
    if (!bid) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/lecturer/students?batch_id=${bid}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || "Failed to load students");
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents(batchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const canSubmit = useMemo(() => {
    if (!batchId) return false;
    if (!email.trim()) return false;
    // If creating new student, need name + password
    if (name.trim() || password) {
      return name.trim().length >= 2 && password.length >= 6;
    }
    // enrolling existing student by email only
    return true;
  }, [batchId, email, name, password]);

  async function submit() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { batch_id: Number(batchId), email: email.trim() };
      if (name.trim()) payload.name = name.trim();
      if (password) payload.password = password;

      const res = await fetch("/api/lecturer/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed");

      setSuccess(data?.message || "Done ✅");
      setName("");
      setEmail("");
      setPassword("");
      await loadStudents(batchId);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lecturer • Students"
        subtitle="Create student accounts and enroll to your batch"
      />

      <Card>
        <CardHeader>
          <CardTitle>Batch Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <Select
            label="Batch"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            options={[
              { value: "", label: "Select batch" },
              ...batches.map((b) => ({ value: String(b.id), label: b.name })),
            ]}
          />

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading...
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create / Enroll Student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password (optional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Saving...
                </span>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2">ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2">{s.id}</td>
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-slate-600">{s.email}</td>
                    <td className="py-2">
                      <Badge variant={s.is_active ? "success" : "danger"}>
                        {s.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      Select a batch to see students
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
