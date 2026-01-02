import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken } from "@/lib/auth";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// ✅ Public register → creates STUDENT account only
// Optional: batch_id (if you want to enroll immediately)
export async function POST(req) {
  try {
    return NextResponse.json(
      { message: "Self-register disabled. Ask your lecturer to create your student account." },
      { status: 403 }
    );

    const { name, email, password, batch_id } = await req.json();

    if (!name || String(name).trim().length < 2) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await query("SELECT id FROM users WHERE email = ?", [String(email).trim()]);
    if (existing.length > 0) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(String(password), 10);

    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
      [String(name).trim(), String(email).trim(), password_hash]
    );

    const userId = result.insertId;

    // optional enroll
    if (batch_id) {
      try {
        await query("INSERT INTO batch_students (batch_id, student_id) VALUES (?, ?)", [batch_id, userId]);
      } catch {
        // ignore duplicate / invalid batch
      }
    }

    // auto login after register
    const token = signToken({ userId, role: "student" });

    const res = NextResponse.json({ message: "Registered", userId }, { status: 201 });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return NextResponse.json({ message: err?.message || "Register error" }, { status: 500 });
  }
}
