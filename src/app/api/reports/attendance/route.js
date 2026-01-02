import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function parseMonth(month) {
  if (!month) return null;
  const m = String(month).trim();
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) return null;
  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mon) || mon < 1 || mon > 12) return null;
  return { year, mon, normalized: `${match[1]}-${match[2]}` };
}

function monthRange(month) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const start = new Date(Date.UTC(parsed.year, parsed.mon - 1, 1));
  const end = new Date(Date.UTC(parsed.year, parsed.mon, 1));
  const toDateString = (d) => d.toISOString().slice(0, 10);
  return { start: toDateString(start), end: toDateString(end) };
}

function jsonToCsv(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

async function checkLecturerScope(lecturerId, batchId, subjectId) {
  const rows = await query(
    "SELECT 1 FROM lecturer_assignments WHERE lecturer_id = ? AND batch_id = ? AND subject_id = ? LIMIT 1",
    [lecturerId, batchId, subjectId]
  );
  return rows && rows.length > 0;
}

// ✅ GET /api/reports/attendance?month=YYYY-MM&batch_id=1&subject_id=1&format=csv
export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (decoded.role !== "lecturer") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const format = (searchParams.get("format") || "json").toLowerCase();
    const batch_id = searchParams.get("batch_id");
    const subject_id = searchParams.get("subject_id");

    if (!month) return NextResponse.json({ message: "month required (YYYY-MM)" }, { status: 400 });
    const parsedMonth = parseMonth(month);
    if (!parsedMonth) {
      return NextResponse.json({ message: "Invalid month. Use YYYY-MM (example: 2026-01)" }, { status: 400 });
    }

    const hasBatch = !!batch_id;
    const hasSubject = !!subject_id;
    const lecturerAllAssignments = decoded.role === "lecturer" && !hasBatch && !hasSubject;

    // Lecturer rules:
    // - If providing filters, must provide both batch_id + subject_id and be assigned.
    // - If no filters provided, return report across ALL assigned batches/subjects.
    if (decoded.role === "lecturer") {
      if ((hasBatch && !hasSubject) || (!hasBatch && hasSubject)) {
        return NextResponse.json({ message: "For lecturer: provide BOTH batch_id and subject_id, or provide NONE" }, { status: 400 });
      }
      if (hasBatch && hasSubject) {
        const ok = await checkLecturerScope(decoded.userId, batch_id, subject_id);
        if (!ok) return NextResponse.json({ message: "Forbidden scope" }, { status: 403 });
      }
    }

    const range = monthRange(parsedMonth.normalized);
    if (!range) {
      return NextResponse.json({ message: "Invalid month range" }, { status: 400 });
    }
    const { start, end } = range;

    // Build student set (batch filter)
    let studentJoin = "FROM users u";
    const whereParams = [];
    const whereStudents = ["u.role = 'student'", "u.is_active = 1"];

    if (batch_id) {
      studentJoin = `FROM batch_students bs
                     JOIN users u ON u.id = bs.student_id`;
      whereStudents.push("bs.batch_id = ?");
      whereParams.push(batch_id);
    }

    // Lecturer (no filters): only students inside lecturer's assigned batches
    if (lecturerAllAssignments) {
      whereStudents.push(`EXISTS (
        SELECT 1
        FROM batch_students bs2
        JOIN lecturer_assignments la2 ON la2.batch_id = bs2.batch_id
        WHERE bs2.student_id = u.id AND la2.lecturer_id = ?
      )`);
      whereParams.push(decoded.userId);
    }

    // attendance filters
    const attFilters = ["a.date >= ?", "a.date < ?"];
    const attParams = [start, end];

    if (batch_id) {
      attFilters.push("a.batch_id = ?");
      attParams.push(batch_id);
    }
    if (subject_id) {
      attFilters.push("a.subject_id = ?");
      attParams.push(subject_id);
    }

    // Lecturer (no filters): restrict attendance rows to lecturer's assignments
    if (lecturerAllAssignments) {
      attFilters.push(`EXISTS (
        SELECT 1
        FROM lecturer_assignments la3
        WHERE la3.lecturer_id = ? AND la3.batch_id = a.batch_id AND la3.subject_id = a.subject_id
      )`);
      attParams.push(decoded.userId);
    }

    // lecturer additional scope: only their assignments (already checked) but keep safe
    if (decoded.role === "lecturer") {
      // ensure attendance is only for that subject/batch (already in filters)
    }

    // IMPORTANT: placeholders appear first in LEFT JOIN (attFilters), then in WHERE (whereStudents)
    const rows = await query(
      `SELECT 
         u.id AS student_id,
         u.name AS student_name,
         COALESCE(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) AS present_days,
         COALESCE(COUNT(a.id), 0) AS total_days,
         CASE
           WHEN COALESCE(COUNT(a.id), 0) = 0 THEN 0
           ELSE ROUND(COALESCE(SUM(CASE WHEN a.status = 1 THEN 1 ELSE 0 END), 0) / COUNT(a.id) * 100, 0)
         END AS percent
       ${studentJoin}
       LEFT JOIN attendance a
         ON a.student_id = u.id
        AND ${attFilters.join(" AND ")}
       WHERE ${whereStudents.join(" AND ")}
       GROUP BY u.id, u.name
       ORDER BY u.id ASC`,
      [...attParams, ...whereParams]
    );

    if (format === "csv") {
      const csv = jsonToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendance_${month}.csv"`,
        },
      });
    }

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("REPORT ATTENDANCE ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
