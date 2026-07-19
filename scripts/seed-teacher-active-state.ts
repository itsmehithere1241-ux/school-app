import { faker } from "@faker-js/faker";
import { createAdminClient } from "./lib/seed-utils";

async function main() {
  const supabase = createAdminClient();

  const { data: teachers, error: fetchError } = await supabase
    .from("teachers")
    .select("id, firstname, lastname, active_state")
    .order("id");

  if (fetchError) {
    console.error("Failed to load teachers:", fetchError.message);
    console.error(
      "If the column is missing, run scripts/sql/add-teacher-active-state.sql in Supabase first.",
    );
    process.exit(1);
  }

  if (!teachers?.length) {
    console.log("No teachers found. Run npm run seed:teachers first.");
    return;
  }

  let updated = 0;

  for (const teacher of teachers) {
    const active_state = faker.datatype.boolean({ probability: 0.8 });

    const { error } = await supabase
      .from("teachers")
      .update({ active_state })
      .eq("id", teacher.id);

    if (error) {
      console.error(`Failed to update teacher ${teacher.id}:`, error.message);
      process.exit(1);
    }

    updated++;
    console.log(
      `  teacher ${teacher.id}: ${teacher.firstname} ${teacher.lastname} → active=${active_state}`,
    );
  }

  console.log(`Updated active_state for ${updated} teacher(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
