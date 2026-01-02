import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function getDecoded(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  try {
    return { decoded: verifyToken(token) };
  } catch {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
}

async function lecturerHasScope(lecturerId, batchId, subjectId) {
  const rows = await query(
    "SELECT 1 FROM lecturer_assignments WHERE lecturer_id = ? AND batch_id = ? AND subject_id = ? LIMIT 1",
    [lecturerId, batchId, subjectId]
  );
  return rows && rows.length > 0;
}

async function studentInBatch(studentId, batchId) {
  const rows = await query(
    "SELECT 1 FROM batch_students WHERE student_id = ? AND batch_id = ? LIMIT 1",
    [studentId, batchId]
  );
  return rows && rows.length > 0;
}

/**
 * ✅ POST /api/marks
 * - Lecturer only
 * - Payload: { batch_id, student_id, subject_id, exam_type, score, date }
 */
export async function POST(req) {
  try {
    const { error, decoded } = await getDecoded(req);
    if (error) return error;

    if (decoded.role !== "lecturer") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { batch_id, student_id, subject_id, exam_type, score, date } = await req.json();

    if (!batch_id || !student_id || !subject_id || !exam_type || score === undefined || !date) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // lecturer scope check
    const ok = await lecturerHasScope(decoded.userId, batch_id, subject_id);
    if (!ok) return NextResponse.json({ message: "Forbidden scope" }, { status: 403 });

    // student must be in that batch
    const inBatch = await studentInBatch(student_id, batch_id);
    if (!inBatch) {
      return NextResponse.json({ message: "Student not enrolled in this batch" }, { status: 400 });
    }

    await query(
      `INSERT INTO marks (batch_id, student_id, subject_id, exam_type, score, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batch_id, student_id, subject_id, exam_type, score, date]
    );

    return NextResponse.json({ message: "Marks saved" }, { status: 201 });
  } catch (err) {
    console.error("MARKS POST ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error saving marks" }, { status: 500 });
  }
}

/**
 * ✅ GET /api/marks
 * - Lecturer: only assigned scope (filter optional)
 * - Student: only own marks
 * Query params: batch_id, subject_id, student_id
 */
export async function GET(req) {
  try {
    const { error, decoded } = await getDecoded(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const batch_id = searchParams.get("batch_id");
    const subject_id = searchParams.get("subject_id");
    const student_id = searchParams.get("student_id");

    if (decoded.role === "student") {
      const rows = await query(
        `SELECT m.id, m.batch_id, b.name AS batch_name, m.subject_id, s.name AS subject_name, s.name AS subject,
                m.exam_type, m.score, m.date
         FROM marks m
         JOIN subjects s ON s.id = m.subject_id
         JOIN batches b ON b.id = m.batch_id
         WHERE m.student_id = ?
         ORDER BY m.date DESC, m.id DESC`,
        [decoded.userId]
      );
      return NextResponse.json(rows);
    }

    if (decoded.role !== "lecturer") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // build dynamic where
    const where = [];
    const params = [];

    if (batch_id) {
      where.push("m.batch_id = ?");
      params.push(batch_id);
    }
    if (subject_id) {
      where.push("m.subject_id = ?");
      params.push(subject_id);
    }
    if (student_id) {
      where.push("m.student_id = ?");
      params.push(student_id);
    }

    // lecturer scope restriction
    if (decoded.role === "lecturer") {
      where.push(`EXISTS (
        SELECT 1 FROM lecturer_assignments la
        WHERE la.lecturer_id = ? AND la.batch_id = m.batch_id AND la.subject_id = m.subject_id
      )`);
      params.push(decoded.userId);
    }

    const sqlWhere = where.length ? "WHERE " + where.join(" AND ") : "";

    const rows = await query(
      `SELECT m.id, m.batch_id, b.name AS batch_name,
              m.student_id, u.name AS student_name,
              m.subject_id, s.name AS subject_name,
              m.exam_type, m.score, m.date
       FROM marks m
       JOIN users u ON u.id = m.student_id
       JOIN subjects s ON s.id = m.subject_id
       JOIN batches b ON b.id = m.batch_id
       ${sqlWhere}
       ORDER BY m.date DESC, m.id DESC`,
      params
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("MARKS GET ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
