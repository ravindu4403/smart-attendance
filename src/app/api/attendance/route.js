import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function mustBeLecturer(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const decoded = verifyToken(token);
  if (decoded.role !== "lecturer") {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { decoded };
}

async function checkLecturerScope(decoded, batch_id, subject_id) {
  const rows = await query(
    "SELECT 1 FROM lecturer_assignments WHERE lecturer_id = ? AND batch_id = ? AND subject_id = ? LIMIT 1",
    [decoded.userId, batch_id, subject_id]
  );
  return rows && rows.length > 0;
}

// ✅ GET /api/attendance?date=YYYY-MM-DD&batch_id=1&subject_id=1
export async function GET(req) {
  try {
    const { error, decoded } = await mustBeLecturer(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const batch_id = searchParams.get("batch_id");
    const subject_id = searchParams.get("subject_id");

    if (!date || !batch_id || !subject_id) {
      return NextResponse.json({ message: "Missing filters" }, { status: 400 });
    }

    const ok = await checkLecturerScope(decoded, batch_id, subject_id);
    if (!ok) return NextResponse.json({ message: "Forbidden scope" }, { status: 403 });

    const rows = await query(
      `SELECT student_id, status
       FROM attendance
       WHERE date = ? AND batch_id = ? AND subject_id = ?
       ORDER BY student_id ASC`,
      [date, batch_id, subject_id]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("ATTENDANCE GET ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ✅ POST /api/attendance  (bulk)
// { date, batch_id, subject_id, records: [{ student_id, status }, ...] }
export async function POST(req) {
  try {
    const { error, decoded } = await mustBeLecturer(req);
    if (error) return error;

    const body = await req.json();
    const { date, batch_id, subject_id, records } = body || {};

    if (!date || !batch_id || !subject_id || !Array.isArray(records)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const ok = await checkLecturerScope(decoded, batch_id, subject_id);
    if (!ok) return NextResponse.json({ message: "Forbidden scope" }, { status: 403 });

    // ✅ validate students belong to batch
    const validStudents = await query(
      `SELECT student_id FROM batch_students WHERE batch_id = ?`,
      [batch_id]
    );
    const validSet = new Set((validStudents || []).map((r) => String(r.student_id)));

    for (const r of records) {
      const sid = r?.student_id;
      if (!sid) continue;
      if (!validSet.has(String(sid))) continue;

      await query(
        `INSERT INTO attendance (date, batch_id, subject_id, lecturer_id, student_id, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), lecturer_id = VALUES(lecturer_id)`,
        [date, batch_id, subject_id, decoded.userId, sid, r.status ? 1 : 0]
      );
    }

    return NextResponse.json({ message: "Attendance saved" }, { status: 201 });
  } catch (err) {
    console.error("ATTENDANCE POST ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
