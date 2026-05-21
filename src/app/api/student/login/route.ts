export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const roll_number =
      typeof body?.roll_number === "string" ? body.roll_number.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!roll_number || !password) {
      return NextResponse.json(
        { ok: false, error: "Roll number and password are required." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const student = await db
      .collection(COLLECTIONS.STUDENTS)
      .findOne({ roll_number });

    if (!student || typeof student.password_hash !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid roll number or password." },
        { status: 401 },
      );
    }
    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid roll number or password." },
        { status: 401 },
      );
    }

    const id = student._id.toString();
    await createSession({ id, role: "student", roll_number });

    return NextResponse.json({
      ok: true,
      student: {
        id,
        roll_number,
        name: student.name ?? "",
        class_section: student.class_section ?? null,
      },
    });
  } catch (err) {
    console.error("[api/student/login]", err);
    return NextResponse.json(
      { ok: false, error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
