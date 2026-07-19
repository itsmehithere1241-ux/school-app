import { clearTables, clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_HOMEWORK_PER_SESSION = 1;
const LOG_SAMPLE_SIZE = 15;

type SessionRow = { id: number; class: number };
type ClassRow = { id: number; class_subject: string };
type HomeworkInsert = {
  session: number;
};

function parseHomeworkPerSession(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.HOMEWORK_PER_SESSION;
  const raw = arg ?? fromEnv ?? String(DEFAULT_HOMEWORK_PER_SESSION);
  const count = Number.parseInt(raw, 10);

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid count "${raw}". Use a positive integer.`);
  }

  return count;
}

function buildHomework(
  sessions: SessionRow[],
  homeworkPerSession: number,
): HomeworkInsert[] {
  const homework: HomeworkInsert[] = [];

  for (const session of sessions) {
    for (let i = 0; i < homeworkPerSession; i++) {
      homework.push({ session: session.id });
    }
  }

  return homework;
}

async function main() {
  const homeworkPerSession = parseHomeworkPerSession();
  const supabase = createAdminClient();

  const [sessionsResult, classesResult] = await Promise.all([
    supabase.from("session").select("id, class").order("id"),
    supabase.from("classes").select("id, class_subject").order("id"),
  ]);

  if (sessionsResult.error) {
    console.error("Failed to load sessions:", sessionsResult.error.message);
    process.exit(1);
  }

  if (classesResult.error) {
    console.error("Failed to load classes:", classesResult.error.message);
    process.exit(1);
  }

  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const classRows = (classesResult.data ?? []) as ClassRow[];

  if (!sessions.length) {
    console.log("No sessions found. Run npm run seed:session first.");
    return;
  }

  await clearTables(supabase, ["hw_submission"]);
  await clearTable(supabase, "homework");

  const homework = buildHomework(sessions, homeworkPerSession);

  const { data, error } = await supabase
    .from("homework")
    .insert(homework)
    .select("id, session");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const classById = new Map(classRows.map((c) => [c.id, c]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  console.log(
    `Inserted ${data?.length ?? 0} homework records (${homeworkPerSession} per session):`,
  );

  for (const row of (data ?? []).slice(0, LOG_SAMPLE_SIZE)) {
    const session = sessionById.get(row.session as number);
    const cls = session ? classById.get(session.class) : undefined;
    const className = cls?.class_subject ?? `class ${session?.class}`;
    console.log(`  homework ${row.id} → session ${row.session} (${className})`);
  }

  if ((data?.length ?? 0) > LOG_SAMPLE_SIZE) {
    console.log(`  … and ${(data?.length ?? 0) - LOG_SAMPLE_SIZE} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
