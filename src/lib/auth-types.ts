/**
 * Account schemas for ShikshakSathi's multi-user platform layer.
 * Hackathon build — passwords are stored as bcrypt hashes only.
 */

export interface Teacher {
  _id?: string;
  name: string;
  email: string;
  password_hash: string;
  institution?: string;
  created_at: Date;
}

export interface Student {
  _id?: string;
  roll_number: string; // unique identifier
  name: string;
  password_hash: string;
  class_section?: string;
  teacher_id: string; // ref to the teacher who created them
  created_at: Date;
}

/** Public-safe teacher profile (no password hash). */
export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  institution: string | null;
}

/** Public-safe student profile (no password hash). */
export interface StudentProfile {
  id: string;
  roll_number: string;
  name: string;
  class_section: string | null;
}
