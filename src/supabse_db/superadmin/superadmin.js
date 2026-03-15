import supabase from "../supabase_client";
import household_supabase from "../household_supabase_client";
import { formatResidentFullName } from "../resident/resident";

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
    return {
      success: false,
      message: "Resident does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("registered_residents")
    .select("id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching resident links:", error);
    return { success: false, message: "Failed to fetch residents" };
  }

  const residentIds = (data || []).map((row) => row.id).filter(Boolean);

  if (residentIds.length === 0) {
    return { success: true, data: [] };
  }

  const { data: residentsData, error: residentsError } =
    await household_supabase
      .from("residents")
      .select("*")
      .in("id", residentIds);

  if (residentsError) {
    console.error("Error fetching residents:", residentsError);
    return { success: false, message: "Failed to fetch residents" };
  }

  const enriched = (residentsData || []).map((resident) => ({
    ...resident,
    full_name: formatResidentFullName(resident) || "Unknown",
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
    return {
      success: false,
      message: "Official does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching officials:", error);
    return { success: false, message: "Failed to fetch officials" };
  }

  const enriched = data.map((official) => ({
    ...official,
    full_name:
      official.firstname && official.lastname
        ? `${official.firstname} ${official.middlename ? official.middlename + " " : ""}${official.lastname}`
        : "Unknown",
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
    return {
      success: false,
      message: "Resident does not exist or you don't have access to it",
    };
  }

  const { data, error } = await household_supabase
    .from("residents")
    .select("*")
    .eq("id", residentId)
    .single();

  if (error) {
    console.error("Error fetching resident:", error);
    console.log("Resident does not exist or you don't have access to it");
    return {
      success: false,
      message: "Resident does not exist or you don't have access to it",
    };
  }

  if (!data) {
    console.log("Resident does not exist or you don't have access to it");
    return {
      success: false,
      message: "Resident does not exist or you don't have access to it",
    };
  }

  return {
    success: true,
    data: {
      ...data,
      full_name: formatResidentFullName(data) || "Unknown",
    },
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
    return {
      success: false,
      message: "Official does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("official_tbl")
    .select("*")
    .eq("id", officialId)
    .single();

  if (error) {
    console.error("Error fetching official:", error);
    console.log("Official does not exist or you don't have access to it");
    return {
      success: false,
      message: "Official does not exist or you don't have access to it",
    };
  }

  if (!data) {
    console.log("Official does not exist or you don't have access to it");
    return {
      success: false,
      message: "Official does not exist or you don't have access to it",
    };
  }

  return {
    success: true,
    data: {
      ...data,
      full_name:
        data.firstname && data.lastname
          ? `${data.firstname} ${data.middlename ? data.middlename + " " : ""}${data.lastname}`
          : "Unknown",
    },
  };
};
