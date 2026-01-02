"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminBatchesPage() {
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/batches", { credentials: "include" });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.message || "Load failed");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  async function createItem() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Create failed");
      setSuccess("Batch created ✅");
      setName("");
      await load();
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b) {
    setError("");
    try {
      const res = await fetch(`/api/admin/batches/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: b.is_active ? 0 : 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Update failed");
      await load();
    } catch (e) {
      setError(e.message || "Error");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Admin • Batches" subtitle="Add & manage batches" />

      <Card>
        <CardHeader>
          <CardTitle>Create Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Batch name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex items-end">
              <Button className="w-full" onClick={createItem} disabled={!canCreate || saving}>
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Creating...
                  </span>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batches List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading...
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2">ID</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2">{b.id}</td>
                    <td className="py-2 font-medium">{b.name}</td>
                    <td className="py-2">
                      <Badge variant={b.is_active ? "success" : "danger"}>
                        {b.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleActive(b)}>
                        {b.is_active ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      No batches
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
