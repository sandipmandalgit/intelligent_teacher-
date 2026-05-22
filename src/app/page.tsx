"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Backpack,
  BarChart3,
  BookOpenCheck,
  Check,
  GraduationCap,
  Languages,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const TEACHER_POINTS = [
  "Grade a full answer sheet in ~20 seconds",
  "Rubric-based scores you can edit before sharing",
  "Class analytics and question-difficulty insights",
];

const FEATURES = [
  {
    icon: Zap,
    title: "20-second grading",
    text: "Upload an answer sheet and get rubric-graded scores in moments.",
  },
  {
    icon: Languages,
    title: "Bilingual feedback",
    text: "Clear feedback in Bengali, Hindi, or English — with audio playback.",
  },
  {
    icon: BarChart3,
    title: "Class analytics",
    text: "See subject performance and the questions students struggle with.",
  },
  {
    icon: BookOpenCheck,
    title: "Student portal",
    text: "Students log in to see their grades, feedback, and lesson plans.",
  },
];

/** Decorative SVG — stacked answer sheets with a checkmark badge. */
function ExamGraphic() {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      role="img"
      aria-label="Stacked answer sheets, graded"
      className="h-full w-full"
    >
      <rect
        x="54"
        y="54"
        width="112"
        height="148"
        rx="16"
        className="fill-accent/25"
        transform="rotate(-10 110 128)"
      />
      <g transform="rotate(6 130 120)">
        <rect
          x="74"
          y="46"
          width="112"
          height="148"
          rx="16"
          className="fill-card stroke-border"
          strokeWidth="2.5"
        />
        <rect x="88" y="66" width="64" height="9" rx="4.5" className="fill-primary/40" />
        <rect x="88" y="86" width="84" height="6" rx="3" className="fill-muted-foreground/30" />
        <rect x="88" y="100" width="76" height="6" rx="3" className="fill-muted-foreground/30" />
        <rect x="88" y="114" width="84" height="6" rx="3" className="fill-muted-foreground/30" />
        <rect x="88" y="134" width="58" height="6" rx="3" className="fill-muted-foreground/30" />
        <rect x="88" y="148" width="70" height="6" rx="3" className="fill-muted-foreground/30" />
      </g>
      <circle cx="172" cy="180" r="30" className="fill-primary" />
      <path
        d="M159 180 l9 9 l17 -19"
        className="stroke-primary-foreground"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Signed-in visitors go straight to their workspace.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tRes = await fetch("/api/teacher/me");
        if (tRes.ok) {
          const d = await tRes.json().catch(() => null);
          if (d?.ok) {
            if (!cancelled) router.replace("/teacher/dashboard");
            return;
          }
        }
        const sRes = await fetch("/api/student/me");
        if (sRes.ok) {
          const d = await sRes.json().catch(() => null);
          if (d?.ok) {
            if (!cancelled) router.replace("/student/dashboard");
            return;
          }
        }
      } catch {
        // Not signed in — show the landing page.
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden">
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-48 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="grid items-center gap-10 py-8 sm:py-12 lg:grid-cols-[1.3fr_1fr]"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI Grading Companion ·{" "}
              <span className="font-bengali">বাংলায় feedback</span>
            </span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Shikshak<span className="text-primary">Sathi</span>
            </h1>
            <p className="mt-3 text-balance text-lg font-semibold text-foreground sm:text-xl">
              The AI grading assistant for India&apos;s classrooms.
            </p>
            <p className="mt-3 max-w-xl text-balance text-base text-muted-foreground">
              Teachers grade handwritten answer sheets in seconds and share
              rubric-based feedback in Bengali, Hindi, or English. Students log
              in to see their results, feedback, and personalised lesson plans.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              Log in or sign up from the{" "}
              <span className="font-semibold text-foreground">Teacher</span> or{" "}
              <span className="font-semibold text-foreground">Student</span>{" "}
              menu in the top bar.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="h-56 w-56 sm:h-72 sm:w-72">
              <ExamGraphic />
            </div>
          </div>
        </motion.section>

        {/* Role cards */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
        >
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">
            Get started
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Choose how you&apos;ll use ShikshakSathi
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {/* Teacher card */}
            <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
              <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
              <div className="p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-lg font-bold text-foreground">
                  For Teachers
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grade answer sheets in seconds, track your class, and give
                  every student clear bilingual feedback.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {TEACHER_POINTS.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs font-medium text-muted-foreground">
                  → Open the{" "}
                  <span className="font-semibold text-primary">Teacher</span>{" "}
                  menu in the top bar to log in or create an account.
                </p>
              </div>
            </Card>

            {/* Student card */}
            <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
              <div className="h-2 bg-gradient-to-r from-accent to-accent/50" />
              <div className="p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-sky-700">
                  <Backpack className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-lg font-bold text-foreground">
                  For Students
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Log in with the roll number and password your teacher gave
                  you to see all your graded exams in one place.
                </p>
                <ul className="mt-3 space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    Every exam score and percentage
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    Question-by-question feedback with audio
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    Personalised lesson plans from your teacher
                  </li>
                </ul>
                <p className="mt-5 text-xs font-medium text-muted-foreground">
                  → Open the{" "}
                  <span className="font-semibold text-primary">Student</span>{" "}
                  menu in the top bar to log in.
                </p>
              </div>
            </Card>
          </div>
        </motion.section>

        {/* Feature highlights */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
          className="mt-12"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Built for India&apos;s teachers · Feedback in{" "}
          <span className="font-bengali">বাংলা</span> · हिन्दी · English
        </p>
      </div>
    </main>
  );
}
