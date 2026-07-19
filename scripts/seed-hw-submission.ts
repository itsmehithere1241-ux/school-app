import { faker } from "@faker-js/faker";
import { clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_SUBMISSION_RATE = 0.85;
const LOG_SAMPLE_SIZE = 15;

type HomeworkRow = { id: number; session: number };
type SessionRow = { id: number; class: number };
type EnrollmentRow = { student: number; class: number };
type StudentRow = { id: number; firstname: string; lastname: string };
type HwSubmissionInsert = {
  homework: number;
  student: number;
};

function parseSubmissionRate(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.SUBMISSION_RATE;
  const raw = arg ?? fromEnv ?? String(DEFAULT_SUBMISSION_RATE);
  const rate = Number.parseFloat(raw);

  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    throw new Error(`Invalid rate "${raw}". Use a number between 0 and 1.`);
  }

  return rate;
}

function buildStudentsByClass(
  enrollments: EnrollmentRow[],
): Map<number, number[]> {
  const studentsByClass = new Map<number, number[]>();

  for (const { student, class: classId } of enrollments) {
    const existing = studentsByClass.get(classId) ?? [];
    existing.push(student);
    studentsByClass.set(classId, existing);
  }

  return studentsByClass;
}

function buildSubmissions(
  homeworkRows: HomeworkRow[],
  sessionClassById: Map<number, number>,
  studentsByClass: Map<number, number[]>,
  submissionRate: number,
): HwSubmissionInsert[] {
  const submissions: HwSubmissionInsert[] = [];

  for (const hw of homeworkRows) {
    const classId = sessionClassById.get(hw.session);
    if (classId === undefined) continue;

    const students = studentsByClass.get(classId) ?? [];

    for (const studentId of students) {
      if (!faker.datatype.boolean({ probability: submissionRate })) {
        continue;
      }

      submissions.push({
        homework: hw.id,
        student: studentId,
      });
    }
  }

  return submissions;
}

async function main() {
  const submissionRate = parseSubmissionRate();
  const supabase = createAdminClient();

  const [homeworkResult, sessionsResult, enrollmentsResult, studentsResult] =
    await Promise.all([
      supabase.from("homework").select("id, session").order("id"),
      supabase.from("session").select("id, class").order("id"),
      supabase.from("enrollment").select("student, class"),
      supabase.from("students").select("id, firstname, lastname").order("id"),
    ]);

  if (homeworkResult.error) {
    console.error("Failed to load homework:", homeworkResult.error.message);
    process.exit(1);
  }

  if (sessionsResult.error) {
    console.error("Failed to load sessions:", sessionsResult.error.message);
    process.exit(1);
  }

  if (enrollmentsResult.error) {
    console.error("Failed to load enrollments:", enrollmentsResult.error.message);
    process.exit(1);
  }

  if (studentsResult.error) {
    console.error("Failed to load students:", studentsResult.error.message);
    process.exit(1);
  }

  const homeworkRows = (homeworkResult.data ?? []) as HomeworkRow[];
  const enrollments = (enrollmentsResult.data ?? []) as EnrollmentRow[];

  if (!homeworkRows.length) {
    console.log("No homework found. Run npm run seed:homework first.");
    return;
  }

  if (!enrollments.length) {
    console.log("No enrollments found. Run npm run seed:enrollment first.");
    return;
  }

  const sessionClassById = new Map(
    ((sessionsResult.data ?? []) as SessionRow[]).map((s) => [s.id, s.class]),
  );
  const studentsByClass = buildStudentsByClass(enrollments);

  await clearTable(supabase, "hw_submission");

  const submissions = buildSubmissions(
    homeworkRows,
    sessionClassById,
    studentsByClass,
    submissionRate,
  );

  if (!submissions.length) {
    console.log("No submissions to insert. Try a higher submission rate.");
    return;
  }

  const { data, error } = await supabase
    .from("hw_submission")
    .insert(submissions)
    .select("id, homework, student");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const studentById = new Map(
    ((studentsResult.data ?? []) as StudentRow[]).map((s) => [s.id, s]),
  );

  console.log(
    `Inserted ${data?.length ?? 0} homework submissions (~${Math.round(submissionRate * 100)}% of enrolled students per assignment):`,
  );

  for (const row of (data ?? []).slice(0, LOG_SAMPLE_SIZE)) {
    const student = studentById.get(row.student as number);
    const studentName = student
      ? `${student.firstname} ${student.lastname}`
      : `student ${row.student}`;
    console.log(
      `  submission ${row.id}: ${studentName} → homework ${row.homework}`,
    );
  }

  if ((data?.length ?? 0) > LOG_SAMPLE_SIZE) {
    console.log(`  … and ${(data?.length ?? 0) - LOG_SAMPLE_SIZE} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
