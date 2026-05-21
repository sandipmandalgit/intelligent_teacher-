export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

/**
 * PATCH — finalizes a grading session into a student's permanent record.
 * Teacher-only. Sets finalized=true, attaches the roll number, stamps
 * submitted_at, and applies a subject override if provided.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "Only teachers can finalize grades." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const session_id =
      typeof body?.session_id === "string" ? body.session_id : "";
    const roll_number =
      typeof body?.roll_number === "string" ? body.roll_number.trim() : "";
    const subject_override =
      typeof body?.subject_override === "string"
        ? body.subject_override.trim()
        : "";
    const lessonPlan =
      body && typeof body.lesson_plan === "object" && body.lesson_plan !== null
        ? body.lesson_plan
        : null;

    if (!session_id || !ObjectId.isValid(session_id)) {
      return NextResponse.json(
        { ok: false, error: "A valid session_id is required." },
        { status: 400 },
      );
    }
    if (!roll_number) {
      return NextResponse.json(
        { ok: false, error: "A roll number is required to finalize." },
        { status: 400 },
      );
    }

    const db = await getDb();

    // The roll number must belong to one of this teacher's students.
    const student = await db
      .collection(COLLECTIONS.STUDENTS)
      .findOne({ roll_number, teacher_id: session.id });
    if (!student) {
      return NextResponse.json(
        { ok: false, error: "That roll number is not in your class." },
        { status: 403 },
      );
    }

    const update: Record<string, unknown> = {
      finalized: true,
      roll_number,
      teacher_id: session.id,
      submitted_at: new Date(),
    };
    if (subject_override) update.subject = subject_override;
    if (lessonPlan) update.lesson_plan = lessonPlan;

    const sessions = db.collection(COLLECTIONS.SESSIONS);
    const matched = await sessions.updateOne(
      { _id: new ObjectId(session_id) },
      { $set: update },
    );
    if (matched.matchedCount === 0) {
      return NextResponse.json(
        { ok: false, error: "That grading session was not found." },
        { status: 404 },
      );
    }

    const updated = await sessions.findOne(
      { _id: new ObjectId(session_id) },
      {
        projection: {
          student_page_samples: 0,
          answer_script_sample: 0,
          grading_result: 0,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      student_name: student.name ?? roll_number,
      session: {
        _id: session_id,
        finalized: true,
        roll_number,
        subject:
          updated && typeof updated.subject === "string"
            ? updated.subject
            : null,
        submitted_at:
          updated?.submitted_at instanceof Date
            ? updated.submitted_at.toISOString()
            : new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[api/archive/finalize]", err);
    return NextResponse.json(
      { ok: false, error: "Could not save to the student record." },
      { status: 500 },
    );
  }
}
