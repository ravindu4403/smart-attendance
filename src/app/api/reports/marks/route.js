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

// ✅ GET /api/reports/marks?month=YYYY-MM&batch_id=1&subject_id=1&format=csv
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

    const where = ["m.date >= ?", "m.date < ?"];
    const params = [start, end];

    if (batch_id) {
      where.push("m.batch_id = ?");
      params.push(batch_id);
    }
    if (subject_id) {
      where.push("m.subject_id = ?");
      params.push(subject_id);
    }

    // Lecturer restriction (safe)
    if (decoded.role === "lecturer") {
      // If lecturer is requesting "all assignments" (no filters), restrict by assignments.
      // If lecturer specified batch+subject, it's already scope-checked but we keep this for safety.
      where.push(`EXISTS (
        SELECT 1 FROM lecturer_assignments la
        WHERE la.lecturer_id = ? AND la.batch_id = m.batch_id AND la.subject_id = m.subject_id
      )`);
      params.push(decoded.userId);
    }

    const rows = await query(
      `SELECT 
         u.id AS student_id,
         u.name AS student_name,
         COALESCE(ROUND(AVG(m.score), 2), 0) AS average_score,
         COUNT(m.id) AS marks_count
       FROM marks m
       JOIN users u ON u.id = m.student_id
       WHERE ${where.join(" AND ")}
       GROUP BY u.id, u.name
       ORDER BY u.id ASC`,
      params
    );

    if (format === "csv") {
      const csv = jsonToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="marks_${month}.csv"`,
        },
      });
    }

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err) {
    console.error("REPORT MARKS ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
