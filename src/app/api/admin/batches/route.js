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

// ✅ GET /api/admin/batches
export async function GET(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const rows = await query("SELECT id, name, is_active, created_at FROM batches ORDER BY id ASC");
    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("ADMIN BATCHES GET ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ✅ POST /api/admin/batches  { name }
export async function POST(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const { name } = await req.json();
    if (!name || String(name).trim().length < 2) {
      return NextResponse.json({ message: "Name required" }, { status: 400 });
    }

    const result = await query("INSERT INTO batches (name) VALUES (?)", [String(name).trim()]);
    return NextResponse.json({ message: "Created", id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error("ADMIN BATCHES POST ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
