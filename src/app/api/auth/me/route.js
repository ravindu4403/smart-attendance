import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

// ✅ GET /api/auth/me  -> returns current user (from token)
export async function GET(req) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const decoded = verifyToken(token);

    const users = await query(
      "SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      const res = NextResponse.json({ user: null }, { status: 401 });
      res.cookies.set("token", "", { path: "/", maxAge: 0 });
      return res;
    }

    return NextResponse.json({
      user: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
      },
    });
  } catch (err) {
    const res = NextResponse.json({ user: null }, { status: 401 });
    res.cookies.set("token", "", { path: "/", maxAge: 0 });
    return res;
  }
}
