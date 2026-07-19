import { faker } from "@faker-js/faker";
import { clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_CLASSES_PER_STUDENT = 3;

type StudentRow = { id: number; firstname: string; lastname: string };
type ClassRow = { id: number; class_subject: string };
type EnrollmentInsert = {
  student: number;
  class: number;
};

function parseClassesPerStudent(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.ENROLLMENTS_PER_STUDENT;
  const raw = arg ?? fromEnv ?? String(DEFAULT_CLASSES_PER_STUDENT);
  const count = Number.parseInt(raw, 10);

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid count "${raw}". Use a positive integer.`);
  }

  return count;
}

function buildEnrollments(
  students: StudentRow[],
  classes: ClassRow[],
  classesPerStudent: number,
): EnrollmentInsert[] {
  const enrollments: EnrollmentInsert[] = [];
  const limit = Math.min(classesPerStudent, classes.length);

  for (const student of students) {
    const assignedClasses = faker.helpers.shuffle(classes).slice(0, limit);

    for (const cls of assignedClasses) {
      enrollments.push({
        student: student.id,
        class: cls.id,
      });
    }
  }

  return enrollments;
}

async function main() {
  const classesPerStudent = parseClassesPerStudent();
  const supabase = createAdminClient();

  const [studentsResult, classesResult] = await Promise.all([
    supabase.from("students").select("id, firstname, lastname").order("id"),
    supabase.from("classes").select("id, class_subject").order("id"),
  ]);

  if (studentsResult.error) {
    console.error("Failed to load students:", studentsResult.error.message);
    process.exit(1);
  }

  if (classesResult.error) {
    console.error("Failed to load classes:", classesResult.error.message);
    process.exit(1);
  }

  const students = (studentsResult.data ?? []) as StudentRow[];
  const classes = (classesResult.data ?? []) as ClassRow[];

  if (!students.length) {
    console.log("No students found. Run npm run seed:students first.");
    return;
  }

  if (!classes.length) {
    console.log("No classes found. Run npm run seed:classes first.");
    return;
  }

  await clearTable(supabase, "enrollment");

  const enrollments = buildEnrollments(students, classes, classesPerStudent);

  const { data, error } = await supabase
    .from("enrollment")
    .insert(enrollments)
    .select("id, student, class");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const classById = new Map(classes.map((c) => [c.id, c]));

  console.log(`Inserted ${data?.length ?? 0} enrollments (${classesPerStudent} classes per student):`);
  for (const row of data ?? []) {
    const student = studentById.get(row.student as number);
    const cls = classById.get(row.class as number);
    const studentName = student
      ? `${student.firstname} ${student.lastname}`
      : `student ${row.student}`;
    const className = cls?.class_subject ?? `class ${row.class}`;
    console.log(`  enrollment ${row.id}: ${studentName} → ${className}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
