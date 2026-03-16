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

const ensureSuperAdminAccess = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const isSuperAdmin = await checkIsSuperAdmin(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "You don't have access to this data",
    };
  }

  return { success: true };
};

const mapRegisteredResidents = (registrations = [], residents = []) => {
  const residentsById = {};

  (residents || []).forEach((resident) => {
    residentsById[resident.id] = resident;
  });

  return (registrations || []).map((registration) => {
    const resident = residentsById[registration.id] || {};

    return {
      ...resident,
      registration_id: registration.id,
      auth_uid: registration.auth_uid,
      registered_email: registration.email || resident.email || "N/A",
      is_activated: registration.is_activated,
      registered_created_at: registration.created_at,
      full_name: formatResidentFullName(resident) || "Unknown",
    };
  });
};

const mapUnregisteredResidents = (residents = []) => {
  return (residents || []).map((resident) => ({
    ...resident,
    full_name: formatResidentFullName(resident) || "Unknown",
  }));
};

export const getAllResidents = async () => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Resident does not exist or you don't have access to it");
    return accessResult;
  }

  const { data, error } = await supabase
    .from("registered_residents")
    .select("id, created_at, auth_uid, is_activated, email")
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

  const enriched = mapRegisteredResidents(data, residentsData);

  return { success: true, data: enriched };
};

export const getRegisteredResidents = async () => {
  return getAllResidents();
};

export const getUnregisteredResidents = async () => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Resident does not exist or you don't have access to it");
    return accessResult;
  }

  const { data: registrations, error: registrationError } = await supabase
    .from("registered_residents")
    .select("id");

  if (registrationError) {
    console.error("Error fetching registered residents:", registrationError);
    return {
      success: false,
      message: "Failed to fetch unregistered residents",
    };
  }

  const registeredIds = [
    ...new Set((registrations || []).map((row) => row.id).filter(Boolean)),
  ];

  let query = household_supabase
    .from("residents")
    .select("*")
    .order("created_at", { ascending: false });

  if (registeredIds.length > 0) {
    const formattedIds = `(${registeredIds.map((id) => `"${id}"`).join(",")})`;
    query = query.not("id", "in", formattedIds);
  }

  const { data: residentsData, error: residentsError } = await query;

  if (residentsError) {
    console.error("Error fetching unregistered residents:", residentsError);
    return {
      success: false,
      message: "Failed to fetch unregistered residents",
    };
  }

  return {
    success: true,
    data: mapUnregisteredResidents(residentsData),
  };
};

export const getAllOfficials = async () => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Official does not exist or you don't have access to it");
    return accessResult;
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
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Resident does not exist or you don't have access to it");
    return accessResult;
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
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Official does not exist or you don't have access to it");
    return accessResult;
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
