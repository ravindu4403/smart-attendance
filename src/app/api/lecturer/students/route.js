import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

async function mustBeLecturer(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };

  const decoded = verifyToken(token);
  if (decoded.role !== "lecturer") return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };

  return { decoded };
}

async function lecturerHasBatch(lecturerId, batchId) {
  const rows = await query(
    "SELECT 1 FROM lecturer_assignments WHERE lecturer_id = ? AND batch_id = ? LIMIT 1",
    [lecturerId, batchId]
  );
  return rows && rows.length > 0;
}

// ✅ GET /api/lecturer/students?batch_id=1
export async function GET(req) {
  try {
    const { error, decoded } = await mustBeLecturer(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const batch_id = searchParams.get("batch_id");
    if (!batch_id) return NextResponse.json({ message: "batch_id required" }, { status: 400 });

    const ok = await lecturerHasBatch(decoded.userId, batch_id);
    if (!ok) return NextResponse.json({ message: "Forbidden batch" }, { status: 403 });

    const rows = await query(
      `SELECT u.id, u.name, u.email, u.is_active
       FROM batch_students bs
       JOIN users u ON u.id = bs.student_id
       WHERE bs.batch_id = ? AND u.role='student'
       ORDER BY u.id ASC`,
      [batch_id]
    );

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("LECTURER STUDENTS GET ERROR:", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ✅ POST /api/lecturer/students
// Create or enroll student
// { batch_id, name, email, password }  -> create student account + enroll
// OR { batch_id, email } -> enroll existing student by email
export async function POST(req) {
  try {
    const { error, decoded } = await mustBeLecturer(req);
    if (error) return error;

    const body = await req.json();
    const batch_id = body?.batch_id;
    const email = String(body?.email || "").trim();

    if (!batch_id || !isValidEmail(email)) {
      return NextResponse.json({ message: "batch_id and valid email required" }, { status: 400 });
    }

    const ok = await lecturerHasBatch(decoded.userId, batch_id);
    if (!ok) return NextResponse.json({ message: "Forbidden batch" }, { status: 403 });

    // if user exists → just enroll (only if student)
    const existing = await query("SELECT id, role FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length > 0) {
      if (existing[0].role !== "student") {
        return NextResponse.json({ message: "This email is not a student account" }, { status: 400 });
      }

      try {
        await query("INSERT INTO batch_students (batch_id, student_id) VALUES (?, ?)", [
          batch_id,
          existing[0].id,
        ]);
      } catch (err) {
        if (String(err?.code) === "ER_DUP_ENTRY") {
          return NextResponse.json({ message: "Student already enrolled" }, { status: 409 });
        }
      }

      return NextResponse.json({ message: "Enrolled existing student", student_id: existing[0].id }, { status: 201 });
    }

    // create new student
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");

    if (!name || name.length < 2) {
      return NextResponse.json({ message: "Name required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ message: "Password min 6" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
      [name, email, password_hash]
    );

    const studentId = result.insertId;

    await query("INSERT INTO batch_students (batch_id, student_id) VALUES (?, ?)", [batch_id, studentId]);

    return NextResponse.json({ message: "Student created & enrolled", student_id: studentId }, { status: 201 });
  } catch (err) {
    console.error("LECTURER STUDENTS POST ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
