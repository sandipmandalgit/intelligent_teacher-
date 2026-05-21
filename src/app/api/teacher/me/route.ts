export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 },
      );
    }
    if (!ObjectId.isValid(session.id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid session." },
        { status: 401 },
      );
    }

    const db = await getDb();
    const teacher = await db
      .collection(COLLECTIONS.TEACHERS)
      .findOne({ _id: new ObjectId(session.id) });

    if (!teacher) {
      return NextResponse.json(
        { ok: false, error: "Account not found." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      teacher: {
        id: teacher._id.toString(),
        name: teacher.name ?? "",
        email: teacher.email ?? "",
        institution: teacher.institution ?? null,
      },
    });
  } catch (err) {
    console.error("[api/teacher/me]", err);
    return NextResponse.json(
      { ok: false, error: "Could not load profile." },
      { status: 500 },
    );
  }
}
