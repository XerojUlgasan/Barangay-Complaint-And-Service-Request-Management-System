import supabase from "../supabase_client";

// Helper function to check if user is superadmin
const checkIsSuperAdmin = async (userId) => {
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userId);

  return superadminData && superadminData.length > 0;
};

export const getAllResidents = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select(`
      *,
      household:household_tbl (
        id,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching residents:", error);
    return { success: false, message: "Failed to fetch residents" };
  }

  const enriched = data.map(resident => ({
    ...resident,
    household_info: resident.household
  }));

  return { success: true, data: enriched };
};

export const getAllOfficials = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

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

export const getResidentById = async (residentId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  // First check if resident exists
  const { data: residentExists } = await supabase
    .from("sample_household_members_tbl")
    .select("id")
    .eq("id", residentId)
    .maybeSingle();

  if (!residentExists) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select(`
      *,
      household:household_tbl (
        id,
        created_at
      )
    `)
    .eq("id", residentId)
    .single();

  if (error) {
    console.error("Error fetching resident:", error);
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  if (!data) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  return { 
    success: true, 
    data: {
      ...data,
      household_info: data.household
    }
  };
};

export const getOfficialById = async (officialId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  // First check if official exists
  const { data: officialExists } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("id", officialId)
    .maybeSingle();

  if (!officialExists) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("id", officialId)
    .single();

  if (error) {
    console.error("Error fetching official:", error);
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  if (!data) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  return { success: true, data };
};