import supabase from "../supabase_client";

export const getOfficialProfile = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("auth_uid", userData.user.id)
    .single();

  if (error) {
    console.error("Official profile error:", error);
    return { success: false, message: "Official profile not found" };
  }

  return { success: true, data };
};
