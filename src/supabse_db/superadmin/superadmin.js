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

  const { data: residentsData, error: residentsError } = await supabase
    .from("residents_tbl")
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

export const getResidentsUsersTable = async () => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    return accessResult;
  }

  const { data, error } = await supabase
    .from("residents_tbl_view")
    .select(
      "id, first_name, middle_name, last_name, suffix, contact_number, email, status, is_activated, auth_uid, auth_email",
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching resident users view:", error);
    return { success: false, message: "Failed to fetch resident users" };
  }

  const mapped = (data || []).map((resident) => ({
    ...resident,
    full_name: formatResidentFullName(resident) || "Unknown",
  }));

  return { success: true, data: mapped };
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

  let query = supabase
    .from("residents_tbl")
    .select("*")
    .order("id", { ascending: false });

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
    .from("barangay_officials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching officials:", error);
    return { success: false, message: "Failed to fetch officials" };
  }

  const enriched = data.map((official) => ({
    ...official,
    id: official.official_id,
    firstname: official.first_name,
    lastname: official.last_name,
    role: official.position,
    full_name:
      official.first_name && official.last_name
        ? `${official.first_name} ${official.last_name}`
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

  const { data, error } = await supabase
    .schema("barangaylink")
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
    .from("barangay_officials")
    .select("*")
    .eq("official_id", officialId)
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
      id: data.official_id,
      firstname: data.first_name,
      lastname: data.last_name,
      role: data.position,
      full_name:
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : "Unknown",
    },
  };
};

export const getOfficialByCode = async (officialCode) => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("Official does not exist or you don't have access to it");
    return accessResult;
  }

  const { data, error } = await supabase
    .from("barangay_officials")
    .select("*")
    .eq("official_code", officialCode)
    .single();

  if (error) {
    console.error("Error fetching official by code:", error);
    return {
      success: false,
      message: "No official found with that code.",
    };
  }

  if (!data) {
    return {
      success: false,
      message: "No official found with that code.",
    };
  }

  return { success: true, data };
};

export const activateOfficial = async (officialId) => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("You don't have access to perform this action");
    return accessResult;
  }

  const { data, error } = await supabase
    .from("barangay_officials")
    .update({ status: "ACTIVE" })
    .eq("official_id", officialId)
    .select()
    .single();

  if (error) {
    console.error("Error activating official:", error);
    return { success: false, message: "Failed to activate official." };
  }

  return { success: true, data };
};

export const deactivateOfficial = async (officialId) => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    console.log("You don't have access to perform this action");
    return accessResult;
  }

  const { data, error } = await supabase
    .from("barangay_officials")
    .update({ status: "INACTIVE" })
    .eq("official_id", officialId)
    .select()
    .single();

  if (error) {
    console.error("Error deactivating official:", error);
    return { success: false, message: "Failed to deactivate official." };
  }

  return { success: true, data };
};

export const getActivatedOfficials = async () => {
  const accessResult = await ensureSuperAdminAccess();

  if (!accessResult.success) {
    return accessResult;
  }

  const { data, error } = await supabase
    .from("barangay_officials")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching activated officials:", error);
    return { success: false, message: "Failed to fetch activated officials." };
  }

  return { success: true, data: data || [] };
};
