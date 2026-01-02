import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function mustBeAdmin(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const decoded = verifyToken(token);
  if (decoded.role !== "admin") return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  return { decoded };
}

// ✅ PATCH /api/admin/subjects/:id  { name?, is_active? }
export async function PATCH(req, { params }) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const id = params.id;
    const body = await req.json();

    const fields = [];
    const values = [];

    if (body?.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name).trim());
    }
    if (body?.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }

    if (!fields.length) return NextResponse.json({ message: "Nothing" }, { status: 400 });

    values.push(id);
    await query(`UPDATE subjects SET ${fields.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ message: "Updated" }, { status: 200 });
  } catch (err) {
    console.error("ADMIN SUBJECTS PATCH ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}

// ✅ DELETE /api/admin/subjects/:id
export async function DELETE(req, { params }) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    await query("DELETE FROM subjects WHERE id = ?", [params.id]);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("ADMIN SUBJECTS DELETE ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
