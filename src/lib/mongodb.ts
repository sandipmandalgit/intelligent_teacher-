import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "MONGODB_URI is missing. Add it to .env.local before using the archive."
  );
}

const DB_NAME = "shikshaksathi";

// Cache the client across hot reloads in dev to avoid connection storms.
// A global augmentation must use `var` — `let`/`const` can't extend globalThis.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export const COLLECTIONS = {
  SESSIONS: "grading_sessions",
  TEACHERS: "teachers",
  STUDENTS: "students",
} as const;
