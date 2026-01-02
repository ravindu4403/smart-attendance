import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

function mustBeAdmin(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const decoded = verifyToken(token);
  if (decoded.role !== "admin") return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  return { decoded };
}

async function getTargetRole(id) {
  const rows = await query("SELECT role FROM users WHERE id = ? LIMIT 1", [id]);
  return rows?.[0]?.role || null;
}

// ✅ PATCH /api/admin/users/:id
// body: { name?, email?, is_active? }
export async function PATCH(req, { params }) {
  try {
    const { error, decoded } = mustBeAdmin(req);
    if (error) return error;

    const id = params.id;
    const body = await req.json();

    const targetRole = await getTargetRole(id);
    if (!targetRole) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Admin does NOT manage students in this system
    if (targetRole === "student") {
      return NextResponse.json({ message: "Admin cannot manage students" }, { status: 403 });
    }

    // Only self-update allowed for admin accounts
    if (targetRole === "admin" && String(decoded.userId) !== String(id)) {
      return NextResponse.json({ message: "You can only update your own admin account" }, { status: 403 });
    }

    // prevent admin disabling self
    if (String(decoded.userId) === String(id) && body?.is_active === 0) {
      return NextResponse.json({ message: "You cannot disable your own account" }, { status: 400 });
    }

    const fields = [];
    const values = [];

    if (body?.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name).trim());
    }
    if (body?.email !== undefined) {
      fields.push("email = ?");
      values.push(String(body.email).trim());
    }
    if (body?.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    values.push(id);

    await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ message: "Updated" }, { status: 200 });
  } catch (err) {
    console.error("ADMIN USERS PATCH ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}

// ✅ DELETE /api/admin/users/:id
// (lecturers only)
export async function DELETE(req, { params }) {
  try {
    const { error, decoded } = mustBeAdmin(req);
    if (error) return error;

    const id = params.id;

    if (String(decoded.userId) === String(id)) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 });
    }

    const targetRole = await getTargetRole(id);
    if (!targetRole) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (targetRole !== "lecturer") {
      return NextResponse.json({ message: "Only lecturers can be deleted by admin" }, { status: 403 });
    }

    await query("DELETE FROM users WHERE id = ? AND role = 'lecturer'", [id]);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("ADMIN USERS DELETE ERROR:", err);
    return NextResponse.json({ message: err?.message || "Error" }, { status: 500 });
  }
}
