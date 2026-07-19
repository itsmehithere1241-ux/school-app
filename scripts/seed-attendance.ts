import { faker } from "@faker-js/faker";
import { clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_ATTENDANCE_RATE = 0.9;
const LOG_SAMPLE_SIZE = 15;

type SessionRow = { id: number; class: number };
type EnrollmentRow = { student: number; class: number };
type StudentRow = { id: number; firstname: string; lastname: string };
type ClassRow = { id: number; class_subject: string };
type AttendanceInsert = {
  session: number;
  student: number;
};

function parseAttendanceRate(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.ATTENDANCE_RATE;
  const raw = arg ?? fromEnv ?? String(DEFAULT_ATTENDANCE_RATE);
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

function buildAttendance(
  sessions: SessionRow[],
  studentsByClass: Map<number, number[]>,
  attendanceRate: number,
): AttendanceInsert[] {
  const attendance: AttendanceInsert[] = [];

  for (const session of sessions) {
    const students = studentsByClass.get(session.class) ?? [];

    for (const studentId of students) {
      if (!faker.datatype.boolean({ probability: attendanceRate })) {
        continue;
      }

      attendance.push({
        session: session.id,
        student: studentId,
      });
    }
  }

  return attendance;
}

async function main() {
  const attendanceRate = parseAttendanceRate();
  const supabase = createAdminClient();

  const [sessionsResult, enrollmentsResult, studentsResult, classesResult] =
    await Promise.all([
      supabase.from("session").select("id, class").order("id"),
      supabase.from("enrollment").select("student, class"),
      supabase.from("students").select("id, firstname, lastname").order("id"),
      supabase.from("classes").select("id, class_subject").order("id"),
    ]);

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

  if (classesResult.error) {
    console.error("Failed to load classes:", classesResult.error.message);
    process.exit(1);
  }

  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const enrollments = (enrollmentsResult.data ?? []) as EnrollmentRow[];

  if (!sessions.length) {
    console.log("No sessions found. Run npm run seed:session first.");
    return;
  }

  if (!enrollments.length) {
    console.log("No enrollments found. Run npm run seed:enrollment first.");
    return;
  }

  const studentsByClass = buildStudentsByClass(enrollments);
  await clearTable(supabase, "attendance");

  const attendance = buildAttendance(sessions, studentsByClass, attendanceRate);

  if (!attendance.length) {
    console.log("No attendance records to insert. Try a higher attendance rate.");
    return;
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert(attendance)
    .select("id, session, student");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const studentById = new Map(
    ((studentsResult.data ?? []) as StudentRow[]).map((s) => [s.id, s]),
  );
  const classById = new Map(
    ((classesResult.data ?? []) as ClassRow[]).map((c) => [c.id, c]),
  );
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  console.log(
    `Inserted ${data?.length ?? 0} attendance records (~${Math.round(attendanceRate * 100)}% of enrolled students per session):`,
  );

  for (const row of (data ?? []).slice(0, LOG_SAMPLE_SIZE)) {
    const student = studentById.get(row.student as number);
    const session = sessionById.get(row.session as number);
    const cls = session ? classById.get(session.class) : undefined;
    const studentName = student
      ? `${student.firstname} ${student.lastname}`
      : `student ${row.student}`;
    const className = cls?.class_subject ?? `class ${session?.class}`;
    console.log(
      `  attendance ${row.id}: ${studentName} → session ${row.session} (${className})`,
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
