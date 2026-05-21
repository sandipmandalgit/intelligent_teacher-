export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { createSession } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const institution =
      typeof body?.institution === "string" ? body.institution.trim() : "";

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Please enter your name." },
        { status: 400 },
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
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
    const teachers = db.collection(COLLECTIONS.TEACHERS);

    const existing = await teachers.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await teachers.insertOne({
      name,
      email,
      password_hash,
      institution: institution || null,
      created_at: new Date(),
    });
    const id = result.insertedId.toString();

    await createSession({ id, role: "teacher", email });

    return NextResponse.json({
      ok: true,
      teacher: { id, name, email, institution: institution || null },
    });
  } catch (err) {
    console.error("[api/teacher/signup]", err);
    return NextResponse.json(
      { ok: false, error: "Signup failed. Please try again." },
      { status: 500 },
    );
  }
}
