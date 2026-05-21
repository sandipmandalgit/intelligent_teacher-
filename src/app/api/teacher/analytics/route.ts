export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

interface QuestionDifficulty {
  subject: string;
  question_number: number;
  question_text: string;
  max_marks: number;
  total_attempts: number;
  total_unattempted: number;
  avg_score: number;
  percent_correct: number;
  percent_partial: number;
  percent_wrong_or_skipped: number;
  difficulty_rank: number;
}

/** Per-question accumulator while scanning sessions. */
interface QuestionAcc {
  subject: string;
  question_number: number;
  max_marks: number;
  question_text: string;
  total: number;
  attempts: number;
  unattempted: number;
  correct: number;
  partial: number;
  wrong: number;
  scoreSum: number;
}

const EMPTY = {
  total_sessions: 0,
  total_students_graded: 0,
  overall_avg_percentage: 0,
  subject_performance: [],
  question_difficulty: [],
};

/**
 * GET — subject-wise performance and question-difficulty analytics across
 * the current teacher's finalized grading sessions. Teacher-only.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const db = await getDb();
    const sessions = db.collection(COLLECTIONS.SESSIONS);
    const match = { teacher_id: session.id, finalized: true };

    // --- Overall totals ----------------------------------------------------
    const overallAgg = await sessions
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            students: { $addToSet: "$roll_number" },
            avg: { $avg: "$percentage" },
          },
        },
      ])
      .toArray();

    const overall = overallAgg[0];
    if (!overall || overall.count === 0) {
      return NextResponse.json(EMPTY);
    }

    const total_sessions =
      typeof overall.count === "number" ? overall.count : 0;
    const total_students_graded = Array.isArray(overall.students)
      ? overall.students.filter(
          (r: unknown) => typeof r === "string" && r.length > 0,
        ).length
      : 0;
    const overall_avg_percentage =
      typeof overall.avg === "number" ? Math.round(overall.avg) : 0;

    // --- Subject performance ----------------------------------------------
    const subjectAgg = await sessions
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: "$subject",
            student_set: { $addToSet: "$roll_number" },
            session_count: { $sum: 1 },
            avg_percentage: { $avg: "$percentage" },
            avg_score: { $avg: "$total_score" },
            avg_max_marks: { $avg: "$total_max_marks" },
            last_graded: { $max: "$created_at" },
          },
        },
        {
          $project: {
            _id: 0,
            subject: "$_id",
            student_count: { $size: "$student_set" },
            session_count: 1,
            avg_percentage: { $round: ["$avg_percentage", 0] },
            avg_score: { $round: ["$avg_score", 1] },
            avg_max_marks: { $round: ["$avg_max_marks", 1] },
            last_graded: 1,
          },
        },
        { $sort: { session_count: -1 } },
      ])
      .toArray();

    const subject_performance = subjectAgg.map((s) => ({
      subject: typeof s.subject === "string" ? s.subject : "Unknown",
      student_count:
        typeof s.student_count === "number" ? s.student_count : 0,
      session_count:
        typeof s.session_count === "number" ? s.session_count : 0,
      avg_percentage:
        typeof s.avg_percentage === "number" ? s.avg_percentage : 0,
      avg_score: typeof s.avg_score === "number" ? s.avg_score : 0,
      avg_max_marks:
        typeof s.avg_max_marks === "number" ? s.avg_max_marks : 0,
      last_graded:
        s.last_graded instanceof Date
          ? s.last_graded.toISOString()
          : new Date().toISOString(),
    }));

    // --- Question difficulty (computed per question across sessions) ------
    const docs = await sessions
      .find(match, {
        projection: {
          subject: 1,
          questions_summary: 1,
          "grading_result.graded_questions.question_number": 1,
          "grading_result.graded_questions.question_text": 1,
        },
      })
      .toArray();

    const accMap = new Map<string, QuestionAcc>();

    for (const doc of docs) {
      const subject = typeof doc.subject === "string" ? doc.subject : "Unknown";
      const summary = Array.isArray(doc.questions_summary)
        ? doc.questions_summary
        : [];

      // Map question_number -> question_text from the full grading result.
      const textByNumber = new Map<number, string>();
      const gradedQuestions = doc.grading_result?.graded_questions;
      if (Array.isArray(gradedQuestions)) {
        for (const q of gradedQuestions) {
          if (
            typeof q?.question_number === "number" &&
            typeof q?.question_text === "string"
          ) {
            textByNumber.set(q.question_number, q.question_text);
          }
        }
      }

      for (const item of summary) {
        const qn =
          typeof item?.question_number === "number"
            ? item.question_number
            : null;
        if (qn === null) continue;
        const maxMarks =
          typeof item?.max_marks === "number" ? item.max_marks : 0;
        const score = typeof item?.score === "number" ? item.score : 0;
        const attempted = item?.attempted === true;

        const key = `${subject}||${qn}`;
        let acc = accMap.get(key);
        if (!acc) {
          acc = {
            subject,
            question_number: qn,
            max_marks: maxMarks,
            question_text: textByNumber.get(qn) ?? `Question ${qn}`,
            total: 0,
            attempts: 0,
            unattempted: 0,
            correct: 0,
            partial: 0,
            wrong: 0,
            scoreSum: 0,
          };
          accMap.set(key, acc);
        }
        if (maxMarks > acc.max_marks) acc.max_marks = maxMarks;
        if (
          acc.question_text === `Question ${qn}` &&
          textByNumber.has(qn)
        ) {
          acc.question_text = textByNumber.get(qn) as string;
        }

        acc.total += 1;
        acc.scoreSum += score;
        if (attempted) {
          acc.attempts += 1;
          if (maxMarks > 0 && score >= maxMarks) acc.correct += 1;
          else if (score > 0) acc.partial += 1;
          else acc.wrong += 1;
        } else {
          acc.unattempted += 1;
          acc.wrong += 1;
        }
      }
    }

    const ranked = Array.from(accMap.values())
      .map((a) => {
        const denom = a.total > 0 ? a.total : 1;
        return {
          subject: a.subject,
          question_number: a.question_number,
          question_text: a.question_text,
          max_marks: a.max_marks,
          total_attempts: a.attempts,
          total_unattempted: a.unattempted,
          avg_score: Math.round((a.scoreSum / denom) * 10) / 10,
          percent_correct: Math.round((a.correct / denom) * 100),
          percent_partial: Math.round((a.partial / denom) * 100),
          percent_wrong_or_skipped: Math.round((a.wrong / denom) * 100),
        };
      })
      .sort(
        (x, y) =>
          y.percent_wrong_or_skipped - x.percent_wrong_or_skipped,
      );

    const question_difficulty: QuestionDifficulty[] = ranked.map((q, i) => ({
      ...q,
      difficulty_rank: i + 1,
    }));

    return NextResponse.json({
      total_sessions,
      total_students_graded,
      overall_avg_percentage,
      subject_performance,
      question_difficulty,
    });
  } catch (err) {
    console.error("[api/teacher/analytics]", err);
    return NextResponse.json(
      { error: "Could not load analytics." },
      { status: 500 },
    );
  }
}
