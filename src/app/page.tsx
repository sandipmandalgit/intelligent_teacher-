"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  GraduationCap,
  LogIn,
  ScrollText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { GradingProgress } from "@/components/upload/GradingProgress";
import { LanguageSelector } from "@/components/upload/LanguageSelector";
import { TrainingArchiveStats } from "@/components/TrainingArchiveStats";

type Language = "bengali" | "hindi" | "english";

interface TeacherInfo {
  id: string;
  name: string;
}
interface StudentLite {
  roll_number: string;
  name: string;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const TRUST_BADGES = [
  { emoji: "🔒", text: "Your files never leave Google's secure servers" },
  { emoji: "⚡", text: "Sub-30-second grading" },
  { emoji: "🇮🇳", text: "Built for Indian classrooms" },
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

export default function Home() {
  const router = useRouter();
  const [answerScript, setAnswerScript] = useState<File | null>(null);
  const [studentPages, setStudentPages] = useState<File[]>([]);
  const [language, setLanguage] = useState<Language>("bengali");
  const [isGrading, setIsGrading] = useState(false);

  // Optional platform linkage (Step 9).
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [rollNumber, setRollNumber] = useState("");
  const [subjectOverride, setSubjectOverride] = useState("");

  const canGrade = answerScript !== null && studentPages.length > 0;

  // Detect a logged-in teacher so grades can be linked to their students.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/teacher/me");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data?.ok) return;
        setTeacher({ id: data.teacher.id, name: data.teacher.name });
        const sRes = await fetch("/api/teacher/students");
        if (sRes.ok) {
          const sData = await sRes.json().catch(() => null);
          if (!cancelled && sData?.ok) setStudents(sData.students ?? []);
        }
      } catch {
        // Not logged in / offline — anonymous grading still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/teacher/logout", { method: "POST" }).catch(() => {});
    setTeacher(null);
    setStudents([]);
    toast.success("Logged out.");
  }

  async function handleGrade() {
    if (!answerScript || studentPages.length === 0) return;
    setIsGrading(true);

    try {
      const formData = new FormData();
      formData.append("answer_script", answerScript);
      studentPages.forEach((page) => formData.append("student_pages", page));
      formData.append("feedback_language", language);

      const res = await fetch("/api/grade", { method: "POST", body: formData });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Grading failed — please try again.";
        setIsGrading(false);
        toast.error(message);
        return;
      }

      // Meta the Result page reads to offer the "Submit Final Grade" action.
      const sessionMeta: {
        roll_number: string | null;
        subject_override: string | null;
        session_id: string | null;
      } = {
        roll_number: rollNumber.trim() || null,
        subject_override: subjectOverride.trim() || null,
        session_id: null,
      };

      // Archive the session. When a roll number is set we await the archive
      // so we can capture its session_id (needed to finalize the grade).
      // Anonymous grading stays fire-and-forget and never blocks the redirect.
      try {
        const archiveData = new FormData();
        archiveData.append("grading_result", JSON.stringify(payload));
        studentPages.forEach((page) =>
          archiveData.append("student_pages", page),
        );
        archiveData.append("answer_script", answerScript);
        if (sessionMeta.roll_number)
          archiveData.append("roll_number", sessionMeta.roll_number);
        if (sessionMeta.subject_override)
          archiveData.append("subject_override", sessionMeta.subject_override);
        if (teacher?.id) archiveData.append("teacher_id", teacher.id);

        if (sessionMeta.roll_number) {
          const archiveRes = await fetch("/api/archive", {
            method: "POST",
            body: archiveData,
          });
          const archiveJson = await archiveRes.json().catch(() => null);
          if (archiveRes.ok && archiveJson?.session_id) {
            sessionMeta.session_id = String(archiveJson.session_id);
            toast.success(
              "✓ Saved to the archive — submit on the next page to finalize",
            );
          }
        } else {
          fetch("/api/archive", { method: "POST", body: archiveData })
            .then((archiveRes) => {
              if (archiveRes.ok) {
                toast.success(
                  "✓ Contributed to ShikshakSathi's open handwriting archive",
                );
              }
            })
            .catch((archiveErr) => {
              console.warn(
                "[archive] background archive failed:",
                archiveErr,
              );
            });
        }
      } catch (archiveErr) {
        console.warn("[archive] archive request failed:", archiveErr);
      }

      // Persist for the result page and the dashboard.
      try {
        localStorage.setItem(
          "shikshaksathi:lastResult",
          JSON.stringify(payload),
        );
        localStorage.setItem(
          "shikshaksathi:lastSessionMeta",
          JSON.stringify(sessionMeta),
        );
        const existingRaw = localStorage.getItem("shikshaksathi:allResults");
        let allResults: unknown[] = [];
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) allResults = parsed;
        }
        allResults.push(payload);
        localStorage.setItem(
          "shikshaksathi:allResults",
          JSON.stringify(allResults),
        );
      } catch {
        // localStorage can be unavailable (e.g. private mode) — non-fatal.
      }

      router.push("/result");
    } catch {
      setIsGrading(false);
      toast.error("Grading failed — please try again.");
    }
  }

  async function loadSample() {
    try {
      const [scriptRes, page1Res, page2Res] = await Promise.all([
        fetch("/samples/sample_answer_script.pdf"),
        fetch("/samples/student1_page1.jpeg"),
        fetch("/samples/student1_page2.jpeg"),
      ]);

      if (!scriptRes.ok || !page1Res.ok || !page2Res.ok) {
        toast.error("Sample exam files aren't available yet.");
        return;
      }

      const scriptFile = new File(
        [await scriptRes.blob()],
        "sample_answer_script.pdf",
        { type: "application/pdf" },
      );
      const page1 = new File([await page1Res.blob()], "student1_page1.jpeg", {
        type: "image/jpeg",
      });
      const page2 = new File([await page2Res.blob()], "student1_page2.jpeg", {
        type: "image/jpeg",
      });

      setAnswerScript(scriptFile);
      setStudentPages([page1, page2]);
      toast.success(
        "Sample exam loaded. Click 'Grade Answer Sheet' when ready.",
      );
    } catch {
      toast.error("Could not load the sample exam.");
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        {/* Teacher session strip */}
        <div className="mb-2">
          {teacher ? (
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">
                  Logged in as {teacher.name}
                </span>
                <span className="text-border">·</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-semibold text-primary hover:underline"
                >
                  Logout
                </button>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-border/70 bg-secondary/50 px-4 py-2.5 text-center text-xs text-muted-foreground">
              <span>
                Log in as a teacher to save grades to your student records
              </span>
              <span className="text-border">·</span>
              <Link
                href="/teacher/login"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="grid items-center gap-8 py-6 sm:py-8 lg:grid-cols-[1.45fr_1fr]"
        >
          <div>
            <Badge
              variant="secondary"
              className="mb-4 gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI Grading Companion ·{" "}
              <span className="font-bengali">বাংলায় feedback</span>
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Grade a full answer sheet in{" "}
              <span className="text-primary">20 seconds.</span>
            </h1>
            <p className="mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Upload your answer script and the student&apos;s pages. Get
              rubric-graded scores with feedback in Bengali, Hindi, or English.
            </p>
          </div>
          <div className="hidden lg:flex lg:justify-end">
            <div className="h-56 w-56 xl:h-64 xl:w-64">
              <ExamGraphic />
            </div>
          </div>
        </motion.section>

        {/* Training-archive "data flywheel" counter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
          className="mb-6"
        >
          <TrainingArchiveStats />
        </motion.div>

        {/* Try sample exam */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground"
        >
          <span>Don&apos;t have files?</span>
          <button
            type="button"
            onClick={loadSample}
            className="inline-flex items-center gap-1 rounded font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/75"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Try sample exam
          </button>
        </motion.div>

        {/* Optional student linkage */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
          className="mb-3"
        >
          <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2 sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="roll-input">
                Student Roll Number{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="roll-input"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                list={teacher ? "teacher-students" : undefined}
                placeholder={
                  teacher ? "Pick or type a roll number" : "e.g. CS2024-017"
                }
              />
              {teacher && (
                <datalist id="teacher-students">
                  {students.map((s) => (
                    <option key={s.roll_number} value={s.roll_number}>
                      {s.name}
                    </option>
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-input">
                Subject Override{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="subject-input"
                value={subjectOverride}
                onChange={(e) => setSubjectOverride(e.target.value)}
                placeholder="e.g. Operating Systems"
              />
            </div>
          </div>
        </motion.div>

        {/* Main upload card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
        >
          <Card className="rounded-3xl border-border/70 bg-card p-6 shadow-xl shadow-primary/10 sm:p-8 lg:p-10">
            <div className="grid gap-6 md:grid-cols-2">
              <FileDropzone
                label="Answer Script"
                description="Upload the official answer script — PDF or image. Single file."
                accept={ACCEPT}
                icon={<FileText className="h-6 w-6" />}
                files={answerScript ? [answerScript] : []}
                onFilesChange={(files) => setAnswerScript(files[0] ?? null)}
              />
              <FileDropzone
                label="Student Answer Pages"
                description="Upload all pages in order. Up to 15 files."
                accept={ACCEPT}
                multiple
                icon={<ScrollText className="h-6 w-6" />}
                files={studentPages}
                onFilesChange={setStudentPages}
              />
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Feedback language
                </p>
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>

              <motion.div
                whileHover={canGrade ? { scale: 1.02 } : undefined}
                whileTap={canGrade ? { scale: 0.98 } : undefined}
                title={
                  canGrade
                    ? undefined
                    : "Upload an answer script and at least one student page."
                }
                className="w-full sm:w-auto"
              >
                <Button
                  onClick={handleGrade}
                  disabled={!canGrade}
                  className="h-14 w-full rounded-xl px-8 text-lg [&_svg]:size-5 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none sm:w-auto"
                >
                  <Sparkles />
                  Grade Answer Sheet
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mt-6 grid gap-3 sm:grid-cols-3"
        >
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.text}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base"
              >
                {badge.emoji}
              </span>
              <p className="text-xs font-medium text-foreground">
                {badge.text}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      <GradingProgress isOpen={isGrading} />
    </>
  );
}
