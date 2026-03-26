import supabase from "../supabase_client";
import { getResidentByAuthUid } from "../resident/resident";

export const getOfficialProfile = async (authUid = null) => {
  let user_id = authUid;

  // If no authUid provided, fetch from current session
  if (!user_id) {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, message: "Not authenticated", data: null };
    }
    user_id = userData.user.id;
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("auth_uid", user_id)
    .maybeSingle(); // FIX: instead of single()

  if (error) {
    console.error("Official profile error:", error);
    return { success: false, message: error.message, data: null };
  }

  if (!data) {
    return {
      success: false,
      message: "Official profile not found",
      data: null,
    };
  }

  return { success: true, data };
};

export const getResidentProfile = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { success: false, message: "Not authenticated", data: null };
  }

  const residentResult = await getResidentByAuthUid(userData.user.id);

  if (!residentResult.success) {
    console.error("Resident profile error:", residentResult.message);
    return { success: false, message: residentResult.message, data: null };
  }

  if (!residentResult.data) {
    return {
      success: false,
      message: "Resident profile not found",
      data: null,
    };
  }

  return { success: true, data: residentResult.data };
};
