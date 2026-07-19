import { faker } from "@faker-js/faker";
import { clearTables, clearTable, createAdminClient } from "./lib/seed-utils";

const DEFAULT_COUNT = 20;

type TeacherInsert = {
  firstname: string;
  lastname: string;
  active_state: boolean;
};

function buildTeacher(): TeacherInsert {
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    active_state: faker.datatype.boolean({ probability: 0.8 }),
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
  const teachers = Array.from({ length: count }, buildTeacher);
  const supabase = createAdminClient();

  await clearTables(supabase, [
    "hw_submission",
    "homework",
    "attendance",
    "enrollment",
    "session",
    "classes",
  ]);
  await clearTable(supabase, "teachers");

  const { data, error } = await supabase
    .from("teachers")
    .insert(teachers)
    .select("id, firstname, lastname, active_state");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data?.length ?? 0} teachers:`);
  for (const row of data ?? []) {
    console.log(
      `  ${row.id}: ${row.firstname} ${row.lastname} (active=${row.active_state})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
