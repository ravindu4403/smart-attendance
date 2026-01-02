import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (decoded.role !== "student") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const studentId = decoded.userId;

    const totalRows = await query(
      "SELECT COUNT(*) AS total FROM attendance WHERE student_id = ?",
      [studentId]
    );
    const presentRows = await query(
      "SELECT COUNT(*) AS present FROM attendance WHERE student_id = ? AND status = 1",
      [studentId]
    );

    const total = totalRows[0]?.total || 0;
    const present = presentRows[0]?.present || 0;

    const percent = total === 0 ? 0 : Math.round((present / total) * 100);

    return NextResponse.json({ percent, total, present });
  } catch (err) {
    console.error("STUDENT ATTENDANCE ERROR:", err);
    return NextResponse.json(
      { message: err?.message || "Error" },
      { status: 500 }
    );
  }
}
