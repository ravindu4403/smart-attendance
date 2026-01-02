"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAssignmentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/lecturers");
  }, [router]);

  return null;
}
