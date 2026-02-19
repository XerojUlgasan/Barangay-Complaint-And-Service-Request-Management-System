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
    console.log("Resident does not exist or you don't have access to it");
    return { success: false, message: "Resident does not exist or you don't have access to it" };
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
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching residents:", error);
    return { success: false, message: "Failed to fetch residents" };
  }

  const enriched = data.map(resident => ({
    ...resident,
    full_name: resident.firstname && resident.lastname
      ? `${resident.firstname} ${resident.middlename ? resident.middlename + ' ' : ''}${resident.lastname}`
      : "Unknown"
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
    console.log("Official does not exist or you don't have access to it");
    return { success: false, message: "Official does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching officials:", error);
    return { success: false, message: "Failed to fetch officials" };
  }

  const enriched = data.map(official => ({
    ...official,
    full_name: official.firstname && official.lastname
      ? `${official.firstname} ${official.middlename ? official.middlename + ' ' : ''}${official.lastname}`
      : "Unknown"
  }));

  return { success: true, data: enriched };
};

export const getResidentById = async (residentId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    console.log("Resident does not exist or you don't have access to it");
    return { success: false, message: "Resident does not exist or you don't have access to it" };
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
    console.log("Resident does not exist or you don't have access to it");
    return { success: false, message: "Resident does not exist or you don't have access to it" };
  }

  if (!data) {
    console.log("Resident does not exist or you don't have access to it");
    return { success: false, message: "Resident does not exist or you don't have access to it" };
  }

  return {
    success: true,
    data: {
      ...data,
      full_name: data.firstname && data.lastname
        ? `${data.firstname} ${data.middlename ? data.middlename + ' ' : ''}${data.lastname}`
        : "Unknown"
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
    console.log("Official does not exist or you don't have access to it");
    return { success: false, message: "Official does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("id", officialId)
    .single();

  if (error) {
    console.error("Error fetching official:", error);
    console.log("Official does not exist or you don't have access to it");
    return { success: false, message: "Official does not exist or you don't have access to it" };
  }

  if (!data) {
    console.log("Official does not exist or you don't have access to it");
    return { success: false, message: "Official does not exist or you don't have access to it" };
  }

  return {
    success: true,
    data: {
      ...data,
      full_name: data.firstname && data.lastname
        ? `${data.firstname} ${data.middlename ? data.middlename + ' ' : ''}${data.lastname}`
        : "Unknown"
    }
  };
};