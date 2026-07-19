import { createAdminClient } from "./lib/seed-utils";

const email = process.env.AUTH_EMAIL ?? "admin@school.app";
const password = process.env.AUTH_PASSWORD ?? "password";

async function main() {
  const supabase = createAdminClient();

  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      { password, email_confirm: true },
    );

    if (updateError) {
      throw updateError;
    }

    console.log(`Updated Supabase Auth user: ${email}`);
    return;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    throw createError;
  }

  console.log(`Created Supabase Auth user: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
