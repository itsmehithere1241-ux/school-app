import { faker } from "@faker-js/faker";
import { clearTables, clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_COUNT = 20;

const SUBJECTS = [
  "Algebra I",
  "Geometry",
  "Biology",
  "Chemistry",
  "Physics",
  "English Literature",
  "Creative Writing",
  "World History",
  "U.S. History",
  "Government",
  "Spanish I",
  "French I",
  "Art Studio",
  "Music Theory",
  "Physical Education",
  "Computer Science",
  "Economics",
  "Psychology",
  "Environmental Science",
  "Health",
];

type TeacherRow = { id: number; firstname: string; lastname: string };
type ClassInsert = {
  class_subject: string;
  teacher: number;
};

function buildClass(teacherId: number): ClassInsert {
  return {
    class_subject: faker.helpers.arrayElement(SUBJECTS),
    teacher: teacherId,
  };
}

function parseCount(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.SEED_COUNT;
  const raw = arg ?? fromEnv ?? String(DEFAULT_COUNT);
  const count = Number.parseInt(raw, 10);

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid count "${raw}". Use a positive integer.`);
  }

  return count;
}

async function main() {
  const count = parseCount();
  const supabase = createAdminClient();

  const { data: teachers, error: teachersError } = await supabase
    .from("teachers")
    .select("id, firstname, lastname")
    .order("id");

  if (teachersError) {
    console.error("Failed to load teachers:", teachersError.message);
    process.exit(1);
  }

  if (!teachers?.length) {
    console.log("No teachers found. Run npm run seed:teachers first.");
    return;
  }

  const teacherRows = teachers as TeacherRow[];

  await clearTables(supabase, [
    "hw_submission",
    "homework",
    "attendance",
    "enrollment",
    "session",
  ]);
  await clearTable(supabase, "classes");

  const classes = Array.from({ length: count }, (_, index) => {
    const teacher = teacherRows[index % teacherRows.length];
    return buildClass(teacher.id);
  });

  const { data, error } = await supabase
    .from("classes")
    .insert(classes)
    .select("id, class_subject, teacher");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const teacherById = new Map(teacherRows.map((t) => [t.id, t]));

  console.log(`Inserted ${data?.length ?? 0} classes:`);
  for (const row of data ?? []) {
    const teacher = teacherById.get(row.teacher as number);
    const teacherName = teacher
      ? `${teacher.firstname} ${teacher.lastname}`
      : `teacher ${row.teacher}`;
    console.log(`  class ${row.id}: ${row.class_subject} → ${teacherName}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
