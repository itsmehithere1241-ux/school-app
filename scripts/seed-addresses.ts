import { faker } from "@faker-js/faker";
import { clearTable, createAdminClient } from "./lib/seed-utils";

type StudentRow = { id: number };
type AddressInsert = {
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  student: number;
};

function buildAddress(studentId: number): AddressInsert {
  return {
    street1: faker.location.streetAddress(),
    street2: faker.helpers.maybe(() => faker.location.secondaryAddress(), {
      probability: 0.3,
    }) ?? null,
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip: faker.location.zipCode(),
    student: studentId,
  };
}

async function main() {
  const supabase = createAdminClient();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .order("id");

  if (studentsError) {
    console.error("Failed to load students:", studentsError.message);
    process.exit(1);
  }

  if (!students?.length) {
    console.log("No students found. Run npm run seed:students first.");
    return;
  }

  await clearTable(supabase, "address");

  const addresses = (students as StudentRow[]).map((student) =>
    buildAddress(student.id),
  );

  const { data, error } = await supabase
    .from("address")
    .insert(addresses)
    .select("id, street1, city, state, zip, student");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data?.length ?? 0} addresses:`);
  for (const row of data ?? []) {
    console.log(
      `  address ${row.id} → student ${row.student}: ${row.street1}, ${row.city}, ${row.state} ${row.zip}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
