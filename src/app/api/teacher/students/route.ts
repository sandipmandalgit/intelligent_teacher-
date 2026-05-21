export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getSession } from "@/lib/session";

/** GET — list every student belonging to the current teacher. */
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
      .collection(COLLECTIONS.STUDENTS)
      .find(
        { teacher_id: session.id },
        { projection: { password_hash: 0 } },
      )
      .sort({ created_at: -1 })
      .toArray();

    const students = docs.map((s) => ({
      id: s._id.toString(),
      roll_number: typeof s.roll_number === "string" ? s.roll_number : "",
      name: typeof s.name === "string" ? s.name : "",
      class_section:
        typeof s.class_section === "string" ? s.class_section : null,
    }));

    return NextResponse.json({ ok: true, students });
  } catch (err) {
    console.error("[api/teacher/students GET]", err);
    return NextResponse.json(
      { ok: false, error: "Could not load students." },
      { status: 500 },
    );
  }
}

/** POST — create a new student account under the current teacher. */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const roll_number =
      typeof body?.roll_number === "string" ? body.roll_number.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const class_section =
      typeof body?.class_section === "string" ? body.class_section.trim() : "";

    if (!roll_number) {
      return NextResponse.json(
        { ok: false, error: "Roll number is required." },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Student name is required." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const students = db.collection(COLLECTIONS.STUDENTS);

    const existing = await students.findOne({ roll_number });
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: `Roll number "${roll_number}" is already registered.`,
        },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await students.insertOne({
      roll_number,
      name,
      password_hash,
      class_section: class_section || null,
      teacher_id: session.id,
      created_at: new Date(),
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: result.insertedId.toString(),
        roll_number,
        name,
        class_section: class_section || null,
      },
    });
  } catch (err) {
    console.error("[api/teacher/students POST]", err);
    return NextResponse.json(
      { ok: false, error: "Could not add student." },
      { status: 500 },
    );
  }
}
