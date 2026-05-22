"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  Backpack,
  BookOpen,
  Loader2,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/dashboard/StatTile";
import {
  StudentExamList,
  type StudentSession,
} from "@/components/student/StudentExamList";

interface StudentProfile {
  id: string;
  roll_number: string;
  name: string;
  class_section: string | null;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/student/me");
        const meData = meRes.ok ? await meRes.json().catch(() => null) : null;
        if (!meData?.ok) {
          if (!cancelled) router.replace("/student/login");
          return;
        }
        if (cancelled) return;
        setStudent(meData.student);

        const sRes = await fetch("/api/student/sessions");
        if (!cancelled && sRes.ok) {
          const d = await sRes.json().catch(() => null);
          if (d?.ok) setSessions((d.sessions ?? []) as StudentSession[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/student/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  const totalExams = sessions.length;
  const avgScore = totalExams
    ? Math.round(
        sessions.reduce((sum, s) => sum + s.percentage, 0) / totalExams,
      )
    : 0;
  const bestSubject = totalExams
    ? sessions.reduce((best, s) => (s.percentage > best.percentage ? s : best))
        .subject
    : "—";

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:py-12">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-sky-700">
            <Backpack className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Welcome back, {student?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Roll {student?.roll_number}
              {student?.class_section ? ` · ${student.class_section}` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut />
          Log out
        </Button>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatTile
          icon={BookOpen}
          label="Total exams"
          value={totalExams}
          sublabel="Graded & submitted"
          tone="primary"
        />
        <StatTile
          icon={TrendingUp}
          label="Average score"
          value={`${avgScore}%`}
          sublabel="Across all exams"
          tone="success"
        />
        <StatTile
          icon={Award}
          label="Best subject"
          value={bestSubject}
          sublabel="Your strongest result"
          tone="accent"
        />
      </motion.div>

      {/* Exam results */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
      >
        <h2 className="mb-3 text-lg font-bold text-foreground">
          Your exam results
        </h2>
        <StudentExamList sessions={sessions} />
      </motion.div>
    </main>
  );
}
