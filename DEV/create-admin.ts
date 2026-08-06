import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Creating/Updating mega_admin user...");

  const email = process.env.ADMIN_EMAIL || "fluowai@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "";
  if (!password) {
    console.error("Missing ADMIN_PASSWORD environment variable.");
    process.exit(1);
  }
  
  // Create user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "mega_admin",
      tenant_id: "system",
      full_name: "Fluo Wai (Mega Admin)"
    }
  });

  if (error) {
    if (error.message.includes("already registered")) {
      console.log("User already exists. Updating password and metadata...");
      // Find user by email
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("Failed to list users", listError);
        return;
      }
      const users = usersData?.users ?? [];
      const user = users.find((u) => u.email === email);
      if (user) {
         await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password,
            user_metadata: {
              role: "mega_admin",
              tenant_id: "system",
              full_name: "Fluo Wai (Mega Admin)"
            }
         });
         
         // Update user_profiles table directly to ensure role is correct
         await supabaseAdmin.from("user_profiles").update({
            role: "mega_admin",
            tenant_id: "system"
         }).eq("id", user.id);
         
         console.log("User updated successfully.");
      }
    } else {
      console.error("Failed to create user:", error);
    }
  } else {
    console.log("User created successfully:", data.user.id);
  }
}

run();
