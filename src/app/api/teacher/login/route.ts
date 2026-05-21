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
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const teacher = await db
      .collection(COLLECTIONS.TEACHERS)
      .findOne({ email });

    if (!teacher || typeof teacher.password_hash !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }
    const valid = await bcrypt.compare(password, teacher.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const id = teacher._id.toString();
    await createSession({ id, role: "teacher", email });

    return NextResponse.json({
      ok: true,
      teacher: {
        id,
        name: teacher.name ?? "",
        email,
        institution: teacher.institution ?? null,
      },
    });
  } catch (err) {
    console.error("[api/teacher/login]", err);
    return NextResponse.json(
      { ok: false, error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
