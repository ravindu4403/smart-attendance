import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

// ✅ GET /api/meta/subjects
// - Logged users only
// - Admin: all active subjects
// - Lecturer: only assigned subjects (based on lecturer_assignments)
// - Student: all subjects (or could be limited, but keep simple)
export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);

    if (decoded.role === "admin") {
      const rows = await query("SELECT id, name FROM subjects WHERE is_active = 1 ORDER BY id ASC");
      return NextResponse.json(rows);
    }

    if (decoded.role === "lecturer") {
      const rows = await query(
        `SELECT DISTINCT s.id, s.name
         FROM lecturer_assignments la
         JOIN subjects s ON s.id = la.subject_id
         WHERE la.lecturer_id = ? AND s.is_active = 1
         ORDER BY s.id ASC`,
        [decoded.userId]
      );
      return NextResponse.json(rows);
    }

    // student
    const rows = await query("SELECT id, name FROM subjects WHERE is_active = 1 ORDER BY id ASC");
    return NextResponse.json(rows);
  } catch (err) {
    console.error("META SUBJECTS ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
