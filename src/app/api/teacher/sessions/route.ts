export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

/**
 * GET — every grading session attributed to the current teacher. Powers
 * the teacher dashboard stat cards and recent-sessions table. Base64
 * image fields and the full grading result are projected out.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 },
      );
    }

    const db = await getDb();
    const docs = await db
      .collection(COLLECTIONS.SESSIONS)
      .find(
        { teacher_id: session.id },
        {
          projection: {
            student_page_samples: 0,
            answer_script_sample: 0,
            grading_result: 0,
          },
        },
      )
      .sort({ created_at: -1 })
      .toArray();

    const sessions = docs.map((d) => ({
      _id: d._id.toString(),
      created_at:
        d.created_at instanceof Date
          ? d.created_at.toISOString()
          : new Date().toISOString(),
      subject: typeof d.subject === "string" ? d.subject : "Unknown",
      total_score: typeof d.total_score === "number" ? d.total_score : 0,
      total_max_marks:
        typeof d.total_max_marks === "number" ? d.total_max_marks : 0,
      percentage: typeof d.percentage === "number" ? d.percentage : 0,
      feedback_language:
        typeof d.feedback_language === "string"
          ? d.feedback_language
          : "english",
      roll_number: typeof d.roll_number === "string" ? d.roll_number : null,
      finalized: d.finalized === true,
    }));

    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    console.error("[api/teacher/sessions]", err);
    return NextResponse.json(
      { ok: false, error: "Could not load sessions." },
      { status: 500 },
    );
  }
}
