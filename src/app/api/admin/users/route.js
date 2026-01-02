import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function mustBeAdmin(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const decoded = verifyToken(token);
  if (decoded.role !== "admin") return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  return { decoded };
}

/**
 * ✅ GET /api/admin/users?role=lecturer
 * Admin responsibilities are setup-only:
 * - Create lecturers (with subject + batch assignment)
 * - Manage subjects/batches
 *
 * NOTE: Students are created by lecturers (not admin).
 */
export async function GET(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get("role") || "lecturer").toLowerCase();

    if (role !== "lecturer") {
      return NextResponse.json({ message: "Only lecturer list is available" }, { status: 400 });
    }

    // List lecturers + their assignments (supports multiple assignments, shown as a combined string)
    const rows = await query(
      `SELECT 
         u.id, u.name, u.email, u.role, u.is_active, u.created_at,
         GROUP_CONCAT(DISTINCT b.name ORDER BY b.id SEPARATOR ', ') AS batch_names,
         GROUP_CONCAT(DISTINCT s.name ORDER BY s.id SEPARATOR ', ') AS subject_names,
         GROUP_CONCAT(DISTINCT CONCAT(b.name, ' - ', s.name) ORDER BY b.id, s.id SEPARATOR ' | ') AS assignments
       FROM users u
       LEFT JOIN lecturer_assignments la ON la.lecturer_id = u.id
       LEFT JOIN batches b ON b.id = la.batch_id
       LEFT JOIN subjects s ON s.id = la.subject_id
       WHERE u.role = 'lecturer'
       GROUP BY u.id, u.name, u.email, u.role, u.is_active, u.created_at
       ORDER BY u.id ASC`,
      []
    );

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("ADMIN USERS GET ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}

/**
 * ✅ POST /api/admin/users
 * Creates a LECTURER and assigns 1 batch + 1 subject
 * Body: { name, email, password, batch_id, subject_id }
 */
export async function POST(req) {
  try {
    const { error } = mustBeAdmin(req);
    if (error) return error;

    const { name, email, password, batch_id, subject_id } = await req.json();

    if (!name || String(name).trim().length < 2) {
      return NextResponse.json({ message: "Name required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Valid email required" }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ message: "Password min 6" }, { status: 400 });
    }
    if (!batch_id || !subject_id) {
      return NextResponse.json({ message: "batch_id and subject_id are required" }, { status: 400 });
    }

    // Validate batch + subject exist (and active)
    const batch = await query("SELECT id FROM batches WHERE id = ? AND is_active = 1 LIMIT 1", [batch_id]);
    if (!batch || batch.length === 0) {
      return NextResponse.json({ message: "Invalid batch" }, { status: 400 });
    }
    const subject = await query("SELECT id FROM subjects WHERE id = ? AND is_active = 1 LIMIT 1", [subject_id]);
    if (!subject || subject.length === 0) {
      return NextResponse.json({ message: "Invalid subject" }, { status: 400 });
    }

    const existing = await query("SELECT id FROM users WHERE email = ?", [String(email).trim()]);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(String(password), 10);

    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'lecturer')",
      [String(name).trim(), String(email).trim(), password_hash]
    );

    const lecturerId = result.insertId;

    try {
      await query(
        "INSERT INTO lecturer_assignments (lecturer_id, batch_id, subject_id) VALUES (?, ?, ?)",
        [lecturerId, batch_id, subject_id]
      );
    } catch (e) {
      // rollback user (best-effort)
      try {
        await query("DELETE FROM users WHERE id = ?", [lecturerId]);
      } catch {}
      throw e;
    }

    return NextResponse.json({ message: "Lecturer created", id: lecturerId }, { status: 201 });
  } catch (err) {
    console.error("ADMIN USERS POST ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
