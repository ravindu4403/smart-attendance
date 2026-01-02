import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function parseMonthRange(month) {
  // month format: YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || m < 1 || m > 12) return null;

  // Start: YYYY-MM-01
  const start = `${yStr}-${mStr}-01`;
  // End: first day of next month
  const endDate = new Date(y, m, 1);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (decoded.role !== "student") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const limitRaw = searchParams.get("limit");

    let limit = 50;
    if (limitRaw) {
      const n = Number(limitRaw);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ message: "Invalid limit" }, { status: 400 });
      }
      limit = Math.min(Math.floor(n), 200);
    }

    const studentId = decoded.userId;

    const where = ["a.student_id = ?"];
    const params = [studentId];

    // Optional month filter
    if (month) {
      const range = parseMonthRange(month);
      if (!range) {
        return NextResponse.json(
          { message: "Invalid month. Use YYYY-MM" },
          { status: 400 }
        );
      }
      where.push("a.date >= ? AND a.date < ?");
      params.push(range.start, range.end);
    }

    const rows = await query(
      `SELECT a.id, a.date,
              a.batch_id, b.name AS batch_name,
              a.subject_id, s.name AS subject_name,
              a.lecturer_id, l.name AS lecturer_name,
              a.status
       FROM attendance a
       JOIN batches b ON b.id = a.batch_id
       JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN users l ON l.id = a.lecturer_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.date DESC, a.id DESC
       LIMIT ${limit}`,
      params
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("STUDENT ATTENDANCE DETAILS ERROR:", err);
    return NextResponse.json(
      { message: err?.message || "Error" },
      { status: 500 }
    );
  }
}
