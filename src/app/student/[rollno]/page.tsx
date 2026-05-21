"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StudentExamList,
  type StudentSession,
} from "@/components/student/StudentExamList";

/**
 * Teacher-facing view of one student's finalized exam records.
 * Linked from the teacher dashboard's student list.
 */
export default function StudentRecordPage({
  params,
}: {
  params: { rollno: string };
}) {
  const router = useRouter();
  const rollNumber = params.rollno;

  const [studentName, setStudentName] = useState("");
  const [classSection, setClassSection] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/teacher/me");
        const meData = meRes.ok ? await meRes.json().catch(() => null) : null;
        if (!meData?.ok) {
          if (!cancelled) router.replace("/teacher/login");
          return;
        }

        // Resolve the student's name/class from the teacher's roster.
        const studentsRes = await fetch("/api/teacher/students");
        if (!cancelled && studentsRes.ok) {
          const d = await studentsRes.json().catch(() => null);
          const list = (d?.ok ? d.students : []) as Array<{
            roll_number: string;
            name: string;
            class_section: string | null;
          }>;
          const match = list.find((s) => s.roll_number === rollNumber);
          if (match) {
            setStudentName(match.name ?? "");
            setClassSection(match.class_section ?? null);
          }
        }

        const sRes = await fetch(
          `/api/student/sessions?roll_number=${encodeURIComponent(rollNumber)}`,
        );
        if (cancelled) return;
        const sData = await sRes.json().catch(() => null);
        if (sRes.ok && sData?.ok) {
          setSessions((sData.sessions ?? []) as StudentSession[]);
        } else {
          setError(
            sData?.error ?? "Could not load this student's grades.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, rollNumber]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:py-12">
      <Button
        asChild
        variant="ghost"
        className="-ml-2 text-muted-foreground hover:text-foreground"
      >
        <Link href="/teacher/dashboard">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {studentName || rollNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          Roll {rollNumber}
          {classSection ? ` · ${classSection}` : ""} · finalized exam records
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        <StudentExamList sessions={sessions} />
      )}
    </main>
  );
}
