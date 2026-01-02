import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const pathname = req.nextUrl.pathname;

  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/marks") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/lecturer");

  if (!needsAuth) return NextResponse.next();

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const decoded = verifyToken(token);

    // ✅ Role-based protection
    if (pathname.startsWith("/admin") && decoded.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/lecturer") && decoded.role !== "lecturer") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Only lecturers can access these (admin is setup-only)
    if (
      (pathname.startsWith("/attendance") ||
        pathname.startsWith("/marks") ||
        pathname.startsWith("/reports")) &&
      decoded.role !== "lecturer"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Only students can access /student page
    if (pathname.startsWith("/student") && decoded.role !== "student") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch (e) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/marks/:path*",
    "/reports/:path*",
    "/student/:path*",
    "/admin/:path*",
    "/lecturer/:path*",
  ],
};
