import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

// ✅ GET /api/meta/students?batch_id=1
// - Lecturer: students only in their assigned batch (batch_id required)
// - Student: returns only self
export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batch_id");

    if (decoded.role === "student") {
      const rows = await query(
        "SELECT id, name, email FROM users WHERE id = ? AND role = 'student' AND is_active = 1",
        [decoded.userId]
      );
      return NextResponse.json(rows);
    }

    // admin cannot access student lists (lecturer-only responsibility)
    if (decoded.role === "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // lecturer
    if (!batchId) {
      return NextResponse.json({ message: "batch_id is required" }, { status: 400 });
    }

    // lecturer must be assigned to that batch
    const asg = await query(
      "SELECT 1 FROM lecturer_assignments WHERE lecturer_id = ? AND batch_id = ? LIMIT 1",
      [decoded.userId, batchId]
    );
    if (!asg || asg.length === 0) {
      return NextResponse.json({ message: "Forbidden batch" }, { status: 403 });
    }

    const rows = await query(
      `SELECT u.id, u.name, u.email
       FROM batch_students bs
       JOIN users u ON u.id = bs.student_id
       WHERE bs.batch_id = ? AND u.role = 'student' AND u.is_active = 1
       ORDER BY u.id ASC`,
      [batchId]
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("META STUDENTS ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
