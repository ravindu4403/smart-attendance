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

export default function AdminLecturersPage() {
  const [lecturers, setLecturers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [batchId, setBatchId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const subjectOptions = useMemo(() => {
    const active = (subjects || []).filter((s) => Number(s.is_active) === 1);
    return [{ value: "", label: "Select subject..." }].concat(
      active.map((s) => ({ value: String(s.id), label: s.name }))
    );
  }, [subjects]);

  const batchOptions = useMemo(() => {
    const active = (batches || []).filter((b) => Number(b.is_active) === 1);
    return [{ value: "", label: "Select batch..." }].concat(
      active.map((b) => ({ value: String(b.id), label: b.name }))
    );
  }, [batches]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [lRes, sRes, bRes] = await Promise.all([
        fetch("/api/admin/users?role=lecturer", { credentials: "include" }),
        fetch("/api/admin/subjects", { credentials: "include" }),
        fetch("/api/admin/batches", { credentials: "include" }),
      ]);

      const [lData, sData, bData] = await Promise.all([
        lRes.json().catch(() => []),
        sRes.json().catch(() => []),
        bRes.json().catch(() => []),
      ]);

      setLecturers(Array.isArray(lData) ? lData : []);
      setSubjects(Array.isArray(sData) ? sData : []);
      setBatches(Array.isArray(bData) ? bData : []);

      // default selects (first active)
      const firstSub = (Array.isArray(sData) ? sData : []).find((x) => Number(x.is_active) === 1);
      const firstBat = (Array.isArray(bData) ? bData : []).find((x) => Number(x.is_active) === 1);
      if (!subjectId && firstSub) setSubjectId(String(firstSub.id));
      if (!batchId && firstBat) setBatchId(String(firstBat.id));
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createLecturer(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required");
      return;
    }
    if (!batchId || !subjectId) {
      setError("Please select both batch and subject");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          batch_id: Number(batchId),
          subject_id: Number(subjectId),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Failed to create lecturer");
        setSaving(false);
        return;
      }

      setSuccess("Lecturer created");
      setName("");
      setEmail("");
      setPassword("");

      await loadAll();
    } catch {
      setError("Failed to create lecturer");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: Number(u.is_active) ? 0 : 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Update failed");
        return;
      }
      setSuccess("Updated");
      await loadAll();
    } catch {
      setError("Update failed");
    }
  }

  async function deleteLecturer(u) {
    setError("");
    setSuccess("");
    if (!confirm(`Delete lecturer: ${u.name}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Delete failed");
        return;
      }
      setSuccess("Deleted");
      await loadAll();
    } catch {
      setError("Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lecturers"
        subtitle="Admin: create lecturers and assign a batch + subject (one-time setup)"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create Lecturer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLecturer} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Name</label>
                <div className="mt-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lecturer name" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Email</label>
                <div className="mt-2">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lecturer@example.com" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Password</label>
                <div className="mt-2">
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="min 6 chars" />
                </div>
              </div>

              <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} options={batchOptions} />
              <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions} />

              <Button className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Create Lecturer"}
              </Button>

              {error && (
                <Alert variant="error" title="Error">
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" title="Success">
                  {success}
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Lecturer List
              {loading ? (
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  <Spinner /> Loading...
                </span>
              ) : (
                <Badge>{lecturers.length} total</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lecturers.length === 0 ? (
              <div className="text-sm text-slate-600">No lecturers yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Assignment</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lecturers.map((u) => (
                      <tr key={u.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4">{u.id}</td>
                        <td className="py-2 pr-4">{u.name}</td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4">
                          <div className="text-xs text-slate-700">
                            {u.assignments || "-"}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {Number(u.is_active) ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="error">Disabled</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => toggleActive(u)}>
                              {Number(u.is_active) ? "Disable" : "Enable"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteLecturer(u)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
