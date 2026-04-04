import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const requiredVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

for (const key of requiredVars) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}. Set env vars before running seed script.`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const users = [
  {
    email: "admin@golfplatform.com",
    password: "Admin@123",
    role: "admin",
    full_name: "Platform Admin"
  },
  {
    email: "user@test.com",
    password: "User@123",
    role: "subscriber",
    full_name: "Test Subscriber"
  }
];

for (const item of users) {
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email?.toLowerCase() === item.email.toLowerCase());

  let userId = found?.id;

  if (!found) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: item.email,
      password: item.password,
      email_confirm: true
    });

    if (error) {
      throw error;
    }

    userId = data.user.id;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: item.email,
      role: item.role,
      full_name: item.full_name,
      charity_percent: 10,
      currency_code: "INR",
      country_code: "IN"
    })
    .select()
    .single();

  if (profileError) {
    if (profileError.code === "PGRST205") {
      throw new Error(
        "Database schema not initialized. Run backend/supabase/schema.sql and backend/supabase/seed.sql in Supabase SQL Editor, then run npm run seed:demo again."
      );
    }
    throw profileError;
  }

  console.log(`Seeded ${item.role}: ${item.email}`);
}

console.log("Demo users seeded successfully.");
