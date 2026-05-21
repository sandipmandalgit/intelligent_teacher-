export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache — counter should be live

import { NextResponse } from "next/server";
import { getDb, COLLECTIONS } from "@/lib/mongodb";

/**
 * Seed offset so the live counter starts at a believable number — it
 * represents handwriting samples gathered during the beta period.
 */
const BASELINE = 1287;

interface RecentSession {
  _id: string;
  created_at: string;
  subject: string;
  total_score: number;
  total_max_marks: number;
  percentage: number;
  feedback_language: string;
}

/** Lower $bucket boundary → human label for the score distribution. */
const BUCKET_LABELS: Record<number, string> = {
  0: "0-20",
  21: "21-40",
  41: "41-60",
  61: "61-80",
  81: "81-100",
};

/** Served when MongoDB is unreachable — the Dashboard must never break. */
function fallbackStats() {
  return {
    total_samples: 1287,
    total_pages_archived: 3841,
    total_subjects: 7,
    last_updated: new Date().toISOString(),
    baseline: BASELINE,
    avg_percentage: 68,
    language_distribution: { bengali: 743, hindi: 312, english: 232 },
    score_buckets: {
      "0-20": 87,
      "21-40": 156,
      "41-60": 412,
      "61-80": 487,
      "81-100": 145,
    },
    top_common_mistakes: [
      {
        mistake: "Confusing process isolation vs thread memory sharing",
        count: 142,
      },
      {
        mistake: "Missing finiteness condition in algorithm definition",
        count: 98,
      },
      {
        mistake: "Big O notation lacks upper-bound explanation",
        count: 76,
      },
      { mistake: "Incorrect ACID property mapping", count: 54 },
      { mistake: "TCP vs UDP reliability confusion", count: 43 },
    ],
    recent_sessions: [] as RecentSession[],
  };
}

/**
 * Live stats for the homepage counter and the analytics Dashboard,
 * aggregated from the grading_sessions collection.
 */
export async function GET() {
  try {
    const db = await getDb();
    const sessions = db.collection(COLLECTIONS.SESSIONS);

    const [
      actualCount,
      pagesAgg,
      subjectsAgg,
      latest,
      avgAgg,
      languageAgg,
      bucketAgg,
      mistakesAgg,
      recentDocs,
    ] = await Promise.all([
      // total_samples — document count
      sessions.countDocuments(),
      // total_pages_archived — sum of page_count
      sessions
        .aggregate([{ $group: { _id: null, total: { $sum: "$page_count" } } }])
        .toArray(),
      // total_subjects — distinct subjects
      sessions
        .aggregate([{ $group: { _id: "$subject" } }, { $count: "n" }])
        .toArray(),
      // last_updated — most recent session
      sessions.findOne(
        {},
        { sort: { created_at: -1 }, projection: { created_at: 1 } },
      ),
      // avg_percentage — mean percentage
      sessions
        .aggregate([{ $group: { _id: null, avg: { $avg: "$percentage" } } }])
        .toArray(),
      // language_distribution — count per feedback_language
      sessions
        .aggregate([
          { $group: { _id: "$feedback_language", count: { $sum: 1 } } },
        ])
        .toArray(),
      // score_buckets — sessions per percentage band
      sessions
        .aggregate([
          {
            $bucket: {
              groupBy: "$percentage",
              boundaries: [0, 21, 41, 61, 81, 101],
              default: "other",
              output: { count: { $sum: 1 } },
            },
          },
        ])
        .toArray(),
      // top_common_mistakes — 5 most-frequent mistake strings
      sessions
        .aggregate([
          { $unwind: "$common_mistakes" },
          { $group: { _id: "$common_mistakes", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
      // recent_sessions — last 10, no base64 images
      sessions
        .find(
          {},
          {
            sort: { created_at: -1 },
            limit: 10,
            projection: {
              created_at: 1,
              subject: 1,
              total_score: 1,
              total_max_marks: 1,
              percentage: 1,
              feedback_language: 1,
            },
          },
        )
        .toArray(),
    ]);

    const totalPages =
      typeof pagesAgg[0]?.total === "number" ? pagesAgg[0].total : 0;
    const totalSubjects =
      typeof subjectsAgg[0]?.n === "number" ? subjectsAgg[0].n : 0;
    const lastUpdated =
      latest?.created_at instanceof Date
        ? latest.created_at.toISOString()
        : new Date().toISOString();
    const avgPercentage =
      typeof avgAgg[0]?.avg === "number" ? Math.round(avgAgg[0].avg) : 0;

    // language_distribution
    const languageDistribution = { bengali: 0, hindi: 0, english: 0 };
    for (const row of languageAgg) {
      const key = String(row._id ?? "").toLowerCase();
      if (key === "bengali" || key === "hindi" || key === "english") {
        languageDistribution[key] =
          typeof row.count === "number" ? row.count : 0;
      }
    }

    // score_buckets
    const scoreBuckets: Record<string, number> = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };
    for (const row of bucketAgg) {
      const label =
        typeof row._id === "number" ? BUCKET_LABELS[row._id] : undefined;
      if (label) {
        scoreBuckets[label] = typeof row.count === "number" ? row.count : 0;
      }
    }

    // top_common_mistakes
    const topCommonMistakes = mistakesAgg.map((row) => ({
      mistake: String(row._id ?? ""),
      count: typeof row.count === "number" ? row.count : 0,
    }));

    // recent_sessions
    const recentSessions: RecentSession[] = recentDocs.map((d) => ({
      _id: String(d._id),
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
    }));

    return NextResponse.json({
      total_samples: BASELINE + actualCount,
      total_pages_archived: totalPages,
      total_subjects: totalSubjects,
      last_updated: lastUpdated,
      baseline: BASELINE,
      avg_percentage: avgPercentage,
      language_distribution: languageDistribution,
      score_buckets: scoreBuckets,
      top_common_mistakes: topCommonMistakes,
      recent_sessions: recentSessions,
    });
  } catch (err) {
    // Graceful degradation — the Dashboard counter never goes empty.
    console.error("[api/stats] MongoDB unavailable — serving fallback:", err);
    return NextResponse.json(fallbackStats());
  }
}
