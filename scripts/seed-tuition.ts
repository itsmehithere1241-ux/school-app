import { faker } from "@faker-js/faker";
import { clearTables, createAdminClient } from "./lib/seed-utils";
import { recordAttendanceCreditUsage } from "../lib/tuition";

const DEFAULT_STARTING_CREDITS = 10;
const LOG_SAMPLE_SIZE = 10;

type StudentRow = { id: number; firstname: string; lastname: string };
type AttendanceRow = { id: number; student: number; session: number };

function parseStartingCredits(): number {
  const arg = process.argv[2];
  const fromEnv = process.env.STARTING_CREDITS;
  const raw = arg ?? fromEnv ?? String(DEFAULT_STARTING_CREDITS);
  const credits = Number.parseFloat(raw);

  if (!Number.isFinite(credits)) {
    throw new Error(`Invalid starting credits "${raw}". Use a number.`);
  }

  return credits;
}

async function main() {
  const startingCredits = parseStartingCredits();
  const supabase = createAdminClient();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, firstname, lastname")
    .order("id");

  if (studentsError) {
    console.error("Failed to load students:", studentsError.message);
    process.exit(1);
  }

  if (!students?.length) {
    console.log("No students found. Run npm run seed:students first.");
    return;
  }

  await clearTables(supabase, ["tuition_transaction", "tuition"]);

  const tuitionRows = (students as StudentRow[]).map((student) => ({
    student: student.id,
    class_credits: faker.number.int({
      min: Math.max(0, startingCredits - 3),
      max: startingCredits + 5,
    }),
  }));

  const { error: tuitionError } = await supabase.from("tuition").insert(tuitionRows);

  if (tuitionError) {
    console.error("Failed to seed tuition accounts:", tuitionError.message);
    process.exit(1);
  }

  console.log(`Created ${tuitionRows.length} tuition accounts.`);

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("attendance")
    .select("id, student, session")
    .order("id");

  if (attendanceError) {
    console.error("Failed to load attendance:", attendanceError.message);
    process.exit(1);
  }

  if (!attendanceRows?.length) {
    console.log(
      "No attendance records found. Run npm run seed:attendance, then re-run seed:tuition to deduct credits.",
    );
    return;
  }

  let applied = 0;

  for (const row of attendanceRows as AttendanceRow[]) {
    const result = await recordAttendanceCreditUsage(
      supabase,
      row.student,
      row.session,
    );

    if (result.error) {
      console.error(
        `Failed to apply attendance credit for attendance ${row.id}:`,
        result.error,
      );
      process.exit(1);
    }

    applied += 1;
  }

  console.log(`Applied attendance credit usage for ${applied} attendance records.`);

  const { data: sampleAccounts, error: sampleError } = await supabase
    .from("tuition")
    .select("student, class_credits")
    .order("student")
    .limit(LOG_SAMPLE_SIZE);

  if (sampleError) {
    console.error("Failed to load tuition sample:", sampleError.message);
    process.exit(1);
  }

  const studentById = new Map(
    (students as StudentRow[]).map((student) => [student.id, student]),
  );

  console.log("Sample tuition balances:");
  for (const row of sampleAccounts ?? []) {
    const student = studentById.get(row.student as number);
    const name = student
      ? `${student.firstname} ${student.lastname}`
      : `student ${row.student}`;
    console.log(`  ${name}: ${row.class_credits} credits`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
