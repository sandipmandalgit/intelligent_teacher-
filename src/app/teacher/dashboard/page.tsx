"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatTile } from "@/components/dashboard/StatTile";
import { RecentSessionsTable } from "@/components/dashboard/RecentSessionsTable";
import {
  SubjectPerformanceCard,
  type SubjectPerformance,
} from "@/components/teacher/SubjectPerformanceCard";
import { type QuestionDifficulty } from "@/components/teacher/QuestionDifficultyPanel";

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  institution: string | null;
}
interface StudentRow {
  id: string;
  roll_number: string;
  name: string;
  class_section: string | null;
}
interface TeacherSession {
  _id: string;
  created_at: string;
  subject: string;
  total_score: number;
  total_max_marks: number;
  percentage: number;
  feedback_language: string;
  roll_number: string | null;
  finalized: boolean;
}
interface TeacherAnalytics {
  total_sessions: number;
  total_students_graded: number;
  overall_avg_percentage: number;
  subject_performance: SubjectPerformance[];
  question_difficulty: QuestionDifficulty[];
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  // Add-student modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [sRoll, setSRoll] = useState("");
  const [sName, setSName] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sClass, setSClass] = useState("");
  const [sError, setSError] = useState("");
  const [sSaving, setSSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    const res = await fetch("/api/teacher/students");
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    if (data?.ok) setStudents(data.students ?? []);
  }, []);

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
        if (cancelled) return;
        setTeacher(meData.teacher);

        const [studentsRes, sessionsRes] = await Promise.all([
          fetch("/api/teacher/students"),
          fetch("/api/teacher/sessions"),
        ]);
        if (!cancelled && studentsRes.ok) {
          const d = await studentsRes.json().catch(() => null);
          if (d?.ok) setStudents(d.students ?? []);
        }
        if (!cancelled && sessionsRes.ok) {
          const d = await sessionsRes.json().catch(() => null);
          if (d?.ok) setSessions(d.sessions ?? []);
        }

        // Analytics — isolated so a failure can't break the rest of the page.
        try {
          const analyticsRes = await fetch("/api/teacher/analytics");
          if (!cancelled) {
            if (analyticsRes.status === 401) {
              router.replace("/teacher/login");
              return;
            }
            if (analyticsRes.ok) {
              const d = await analyticsRes.json().catch(() => null);
              if (d && typeof d === "object" && "subject_performance" in d) {
                setAnalytics(d as TeacherAnalytics);
              } else {
                setAnalyticsError(true);
              }
            } else {
              setAnalyticsError(true);
            }
          }
        } catch {
          if (!cancelled) setAnalyticsError(true);
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
    await fetch("/api/teacher/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  async function handleAddStudent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSError("");
    setSSaving(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll_number: sRoll,
          name: sName,
          password: sPassword,
          class_section: sClass,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setSError(data?.error ?? "Could not add student.");
        setSSaving(false);
        return;
      }
      setModalOpen(false);
      setSRoll("");
      setSName("");
      setSPassword("");
      setSClass("");
      setSSaving(false);
      await loadStudents();
    } catch {
      setSError("Network error. Please try again.");
      setSSaving(false);
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = sessions.filter(
    (s) => new Date(s.created_at).getTime() >= weekAgo,
  ).length;
  const avgScore = sessions.length
    ? Math.round(
        sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length,
      )
    : 0;

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:py-12">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Welcome, {teacher?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {teacher?.institution || "Teacher workspace"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/grade">
              <Sparkles />
              Grade a sheet
            </Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut />
            Log out
          </Button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatTile
          icon={Users}
          label="Students enrolled"
          value={students.length}
          sublabel="In your class"
          tone="primary"
        />
        <StatTile
          icon={BookOpen}
          label="Sessions graded"
          value={sessions.length}
          sublabel="All-time"
          tone="accent"
        />
        <StatTile
          icon={TrendingUp}
          label="Avg. class score"
          value={`${avgScore}%`}
          sublabel="Across your sessions"
          tone="success"
        />
        <StatTile
          icon={CalendarClock}
          label="This week"
          value={sessionsThisWeek}
          sublabel="Sessions in last 7 days"
          tone="neutral"
        />
      </motion.div>

      {/* Subject Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      >
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            Subject Performance Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Per-subject performance across all your finalized grading sessions
          </p>
        </div>
        {analyticsError ? (
          <Card className="rounded-2xl border-border/70 p-5 text-sm text-muted-foreground shadow-sm">
            Analytics temporarily unavailable.
          </Card>
        ) : !analytics || analytics.subject_performance.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border bg-secondary/40 p-8 text-center shadow-none">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <BookOpen className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">
              No graded subjects yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Grade and submit your first answer sheet to see subject
              analytics here.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/grade">Grade a sheet</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.subject_performance.map((s, i) => (
              <motion.div
                key={s.subject}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.2 + i * 0.05,
                  ease: EASE,
                }}
              >
                <SubjectPerformanceCard
                  {...s}
                  questions={analytics.question_difficulty.filter(
                    (q) => q.subject === s.subject,
                  )}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* My Students */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
      >
        <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                My Students
              </h2>
              <p className="text-xs text-muted-foreground">
                Accounts you&apos;ve created for your class
              </p>
            </div>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus />
              Add Student
            </Button>
          </div>

          {students.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No students yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first student to start linking grades.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-secondary-foreground">
                      {s.roll_number.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.roll_number}
                        {s.class_section ? ` · ${s.class_section}` : ""}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/student/${encodeURIComponent(s.roll_number)}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View their grades →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>

      {/* Recent sessions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
      >
        <RecentSessionsTable sessions={sessions.slice(0, 10)} />
      </motion.div>

      {/* Add Student modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>
              Create a login for a student. Share the roll number and
              password with them so they can see their grades.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-roll">Roll number</Label>
              <Input
                id="s-roll"
                value={sRoll}
                onChange={(e) => setSRoll(e.target.value)}
                placeholder="CS2024-017"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Student name</Label>
              <Input
                id="s-name"
                value={sName}
                onChange={(e) => setSName(e.target.value)}
                placeholder="Riya Das"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-pass">Password</Label>
              <Input
                id="s-pass"
                type="text"
                value={sPassword}
                onChange={(e) => setSPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-class">
                Class / section{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="s-class"
                value={sClass}
                onChange={(e) => setSClass(e.target.value)}
                placeholder="CS - 3rd year"
              />
            </div>
            {sError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {sError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sSaving}>
                {sSaving ? <Loader2 className="animate-spin" /> : <UserPlus />}
                {sSaving ? "Adding…" : "Add student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
