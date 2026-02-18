import supabase from "../supabase_client";

export const getAssignedComplaints = async () => {
  const { data, error } = await supabase.from("complaint_tbl").select("*") .eq("assigned_official_id", (await supabase.auth.getUser()).data.user.id ); // Replace with actual official ID
  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    console.log(data);
    return;
  }
};

export const getAssignedRequests = async () => {
  const { data, error } = await supabase.from("request_tbl").select("*") .eq("assigned_official_id", (await supabase.auth.getUser()).data.user.id ); // Replace with actual official ID
  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    console.log(data);
    return;
  }
};

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

export const getAllOfficials = async () => {
  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching officials:", error);
    return { success: false, message: "Failed to fetch officials" };
  }

  return { success: true, data };
};

export const getOfficialById = async (officialId) => {
  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("id", officialId)
    .single();

  if (error) {
    console.error("Error fetching official:", error);
    return { success: false, message: "Failed to fetch official" };
  }

  return { success: true, data };
};

export const updateOfficialRole = async (officialId, role) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();

  if (!superadminData) {
    return {
      success: false,
      message: "Only superadmins can update official roles",
    };
  }

  const { error } = await supabase
    .from("official_tbl")
    .update({ role: role })
    .eq("id", officialId);

  if (error) {
    console.error("Error updating official role:", error);
    return { success: false, message: "Failed to update official role" };
  }

  return { success: true, message: "Official role updated successfully" };
};
