import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Lightweight JWT-in-httpOnly-cookie sessions. Hackathon build — no
 * refresh tokens, no rotation. The same cookie carries either a teacher
 * or a student session, distinguished by `role`.
 */

const COOKIE_NAME = "shikshaksathi_session";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    "shikshaksathi-dev-fallback-secret-change-me-please",
);

export interface SessionPayload {
  id: string;
  role: "teacher" | "student";
  roll_number?: string;
  email?: string;
}

/** Signs a JWT for the payload and writes it as an httpOnly cookie. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const claims: Record<string, unknown> = {
    id: payload.id,
    role: payload.role,
  };
  if (payload.roll_number) claims.roll_number = payload.roll_number;
  if (payload.email) claims.email = payload.email;

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SEVEN_DAYS_SECONDS,
    path: "/",
  });
}

/** Reads and verifies the session cookie. Returns null if absent/invalid. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.id === "string" &&
      (payload.role === "teacher" || payload.role === "student")
    ) {
      return {
        id: payload.id,
        role: payload.role,
        roll_number:
          typeof payload.roll_number === "string"
            ? payload.roll_number
            : undefined,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Clears the session cookie. */
export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}
