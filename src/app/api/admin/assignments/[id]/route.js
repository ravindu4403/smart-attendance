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

// ✅ DELETE /api/admin/assignments/:id
export async function DELETE(req, { params }) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    await query("DELETE FROM lecturer_assignments WHERE id = ?", [params.id]);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("ADMIN ASSIGNMENTS DELETE ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
