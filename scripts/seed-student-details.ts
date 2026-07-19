import { faker } from "@faker-js/faker";
import { createAdminClient } from "./lib/seed-utils";

type StudentRow = {
  id: number;
  firstname: string;
  lastname: string;
};

async function main() {
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

  for (const student of students as StudentRow[]) {
    const averageGrade = faker.number.float({
      min: 70,
      max: 100,
      fractionDigits: 1,
    });

    const { error } = await supabase
      .from("students")
      .update({
        average_grade: averageGrade,
        parent_name: faker.person.fullName(),
        parent_phone: faker.phone.number(),
        parent_email: faker.internet.email({
          firstName: student.firstname,
          lastName: student.lastname,
        }),
      })
      .eq("id", student.id);

    if (error) {
      console.error(`Failed to update student ${student.id}:`, error.message);
      process.exit(1);
    }
  }

  console.log(
    `Updated ${students.length} students with average grade and parent contact info.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
