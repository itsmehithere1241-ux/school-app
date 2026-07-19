import { faker } from "@faker-js/faker";
import { clearTables, clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_COUNT = 20;

type StudentInsert = {
  firstname: string;
  lastname: string;
  dob: string;
};

function buildStudent(): StudentInsert {
  const birthdate = faker.date.birthdate({ min: 8, max: 10, mode: "age" });

  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    dob: birthdate.toISOString().slice(0, 10),
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
  const students = Array.from({ length: count }, buildStudent);
  const supabase = createAdminClient();

  await clearTables(supabase, [
    "tuition_transaction",
    "tuition",
    "hw_submission",
    "attendance",
    "enrollment",
    "address",
  ]);
  await clearTable(supabase, "students");

  const { data, error } = await supabase
    .from("students")
    .insert(students)
    .select("id, firstname, lastname, dob");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data?.length ?? 0} students:`);
  for (const row of data ?? []) {
    const birth = new Date(row.dob as string);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    console.log(
      `  ${row.id}: ${row.firstname} ${row.lastname} (DOB ${row.dob}, Grade ${age - 5})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
