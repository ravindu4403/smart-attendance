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

// ✅ GET /api/admin/assignments
export async function GET(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const rows = await query(
      `SELECT la.id,
              la.lecturer_id, u.name AS lecturer_name, u.email AS lecturer_email,
              la.batch_id, b.name AS batch_name,
              la.subject_id, s.name AS subject_name,
              la.created_at
       FROM lecturer_assignments la
       JOIN users u ON u.id = la.lecturer_id
       JOIN batches b ON b.id = la.batch_id
       JOIN subjects s ON s.id = la.subject_id
       ORDER BY la.id ASC`
    );

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("ADMIN ASSIGNMENTS GET ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ✅ POST /api/admin/assignments
// { lecturer_id, batch_id, subject_id }
export async function POST(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const { lecturer_id, batch_id, subject_id } = await req.json();
    if (!lecturer_id || !batch_id || !subject_id) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    // ensure lecturer role
    const lec = await query("SELECT id FROM users WHERE id = ? AND role = 'lecturer' AND is_active = 1", [lecturer_id]);
    if (!lec.length) return NextResponse.json({ message: "Invalid lecturer" }, { status: 400 });

    await query(
      "INSERT INTO lecturer_assignments (lecturer_id, batch_id, subject_id) VALUES (?, ?, ?)",
      [lecturer_id, batch_id, subject_id]
    );

    return NextResponse.json({ message: "Assigned" }, { status: 201 });
  } catch (err) {
    console.error("ADMIN ASSIGNMENTS POST ERROR:", err);
    // duplicate
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return NextResponse.json({ message: "Already assigned" }, { status: 409 });
    }
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
