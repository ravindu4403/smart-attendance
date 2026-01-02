import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken } from "@/lib/auth";

// ✅ POST /api/auth/login
// body: { email, password }
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email & password required" }, { status: 400 });
    }

    const rows = await query(
      "SELECT id, name, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
      [String(email).trim()]
    );

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ message: "Account disabled" }, { status: 403 });
    }

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // ✅ JWT (id + role only)
    const token = signToken({
      userId: user.id,
      role: user.role,
    });

    const res = NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ message: err?.message || "Login error" }, { status: 500 });
  }
}
