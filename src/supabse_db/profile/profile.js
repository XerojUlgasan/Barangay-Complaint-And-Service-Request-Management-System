import supabase from "../supabase_client";

export const getOfficialProfile = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { success: false, message: "Not authenticated", data: null };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("auth_uid", userData.user.id)
    .maybeSingle(); // FIX: instead of single()

  if (error) {
    console.error("Official profile error:", error);
    return { success: false, message: error.message, data: null };
  }

  if (!data) {
    return { success: false, message: "Official profile not found", data: null };
  }

  return { success: true, data };
};

export const getResidentProfile = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { success: false, message: "Not authenticated", data: null };
  }

  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select("*")
    .eq("auth_uid", userData.user.id)
    .maybeSingle(); // FIX

  if (error) {
    console.error("Resident profile error:", error);
    return { success: false, message: error.message, data: null };
  }

  if (!data) {
    return { success: false, message: "Resident profile not found", data: null };
  }

  return { success: true, data };
};
