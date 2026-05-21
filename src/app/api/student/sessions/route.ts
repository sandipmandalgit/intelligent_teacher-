export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

/**
 * GET — a student's finalized grading sessions.
 *
 * - Student session: returns the logged-in student's own results.
 * - Teacher session with `?roll_number=`: returns that student's results,
 *   provided the student belongs to the requesting teacher.
 *
 * Large base64 image fields are projected out; the full grading_result
 * (text) is kept so the student portal can render rich breakdowns.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 },
      );
    }

    const db = await getDb();
    let rollNumber: string;

    if (session.role === "student") {
      rollNumber = session.roll_number ?? "";
    } else {
      const requested =
        new URL(req.url).searchParams.get("roll_number")?.trim() ?? "";
      if (!requested) {
        return NextResponse.json(
          { ok: false, error: "A roll_number is required." },
          { status: 400 },
        );
      }
      const owns = await db
        .collection(COLLECTIONS.STUDENTS)
        .findOne({ roll_number: requested, teacher_id: session.id });
      if (!owns) {
        return NextResponse.json(
          { ok: false, error: "That student is not in your class." },
          { status: 403 },
        );
      }
      rollNumber = requested;
    }

    if (!rollNumber) {
      return NextResponse.json({ ok: true, sessions: [] });
    }

    const docs = await db
      .collection(COLLECTIONS.SESSIONS)
      .find(
        { roll_number: rollNumber, finalized: true },
        { projection: { student_page_samples: 0, answer_script_sample: 0 } },
      )
      .sort({ created_at: -1 })
      .toArray();

    const sessions = docs.map((d) => ({
      _id: d._id.toString(),
      created_at:
        d.created_at instanceof Date
          ? d.created_at.toISOString()
          : new Date().toISOString(),
      submitted_at:
        d.submitted_at instanceof Date ? d.submitted_at.toISOString() : null,
      subject: typeof d.subject === "string" ? d.subject : "Unknown",
      total_score: typeof d.total_score === "number" ? d.total_score : 0,
      total_max_marks:
        typeof d.total_max_marks === "number" ? d.total_max_marks : 0,
      percentage: typeof d.percentage === "number" ? d.percentage : 0,
      feedback_language:
        typeof d.feedback_language === "string"
          ? d.feedback_language
          : "english",
      common_mistakes: Array.isArray(d.common_mistakes)
        ? d.common_mistakes
        : [],
      grading_result: d.grading_result ?? null,
      lesson_plan: d.lesson_plan ?? null,
    }));

    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    console.error("[api/student/sessions]", err);
    return NextResponse.json(
      { ok: false, error: "Could not load results." },
      { status: 500 },
    );
  }
}
