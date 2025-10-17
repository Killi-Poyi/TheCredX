import { createClient } from "@/utils/supabase/server";

import { User } from "@supabase/supabase-js";


export default async function AuthenticateUser(): Promise<User> {

  const supabase =  await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
