import { clearTables, clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_SESSIONS_PER_CLASS = 5;

type ClassRow = { id: number; class_subject: string };
type SessionInsert = {
  class: number;
};

function parseSessionsPerClass(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.SESSIONS_PER_CLASS;
  const raw = arg ?? fromEnv ?? String(DEFAULT_SESSIONS_PER_CLASS);
  const count = Number.parseInt(raw, 10);

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid count "${raw}". Use a positive integer.`);
  }

  return count;
}

function buildSessions(
  classes: ClassRow[],
  sessionsPerClass: number,
): SessionInsert[] {
  const sessions: SessionInsert[] = [];

  for (const cls of classes) {
    for (let i = 0; i < sessionsPerClass; i++) {
      sessions.push({ class: cls.id });
    }
  }

  return sessions;
}

async function main() {
  const sessionsPerClass = parseSessionsPerClass();
  const supabase = createAdminClient();

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, class_subject")
    .order("id");

  if (classesError) {
    console.error("Failed to load classes:", classesError.message);
    process.exit(1);
  }

  const classRows = (classes ?? []) as ClassRow[];

  if (!classRows.length) {
    console.log("No classes found. Run npm run seed:classes first.");
    return;
  }

  await clearTables(supabase, ["hw_submission", "homework", "attendance"]);
  await clearTable(supabase, "session");

  const sessions = buildSessions(classRows, sessionsPerClass);

  const { data, error } = await supabase
    .from("session")
    .insert(sessions)
    .select("id, class");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const classById = new Map(classRows.map((c) => [c.id, c]));

  console.log(
    `Inserted ${data?.length ?? 0} sessions (${sessionsPerClass} per class):`,
  );
  for (const row of data ?? []) {
    const cls = classById.get(row.class as number);
    const className = cls?.class_subject ?? `class ${row.class}`;
    console.log(`  session ${row.id} → ${className}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
