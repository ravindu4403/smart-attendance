import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

// ✅ GET /api/meta/batches
// - Logged users only
// - Admin: all active batches
// - Lecturer: only assigned batches
// - Student: only enrolled batches
export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);

    if (decoded.role === "admin") {
      const rows = await query("SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id ASC");
      return NextResponse.json(rows);
    }

    if (decoded.role === "lecturer") {
      const rows = await query(
        `SELECT DISTINCT b.id, b.name
         FROM lecturer_assignments la
         JOIN batches b ON b.id = la.batch_id
         WHERE la.lecturer_id = ? AND b.is_active = 1
         ORDER BY b.id ASC`,
        [decoded.userId]
      );
      return NextResponse.json(rows);
    }

    if (decoded.role === "student") {
      const rows = await query(
        `SELECT DISTINCT b.id, b.name
         FROM batch_students bs
         JOIN batches b ON b.id = bs.batch_id
         WHERE bs.student_id = ? AND b.is_active = 1
         ORDER BY b.id ASC`,
        [decoded.userId]
      );
      return NextResponse.json(rows);
    }

    return NextResponse.json([], { status: 200 });
  } catch (err) {
    console.error("META BATCHES ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
