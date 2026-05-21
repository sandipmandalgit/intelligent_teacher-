export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "student") {
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
    const student = await db
      .collection(COLLECTIONS.STUDENTS)
      .findOne({ _id: new ObjectId(session.id) });

    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Account not found." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      student: {
        id: student._id.toString(),
        roll_number: student.roll_number ?? "",
        name: student.name ?? "",
        class_section: student.class_section ?? null,
      },
    });
  } catch (err) {
    console.error("[api/student/me]", err);
    return NextResponse.json(
      { ok: false, error: "Could not load profile." },
      { status: 500 },
    );
  }
}
