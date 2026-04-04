import supabase from "../supabase_client";

const checkUserRole = async (userId) => {
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userId);

  const { data: officialData } = await supabase
    .from("barangay_officials")
    .select("official_id")
    .eq("uid", userId);

  return {
    isSuperAdmin: superadminData && superadminData.length > 0,
    isOfficial: officialData && officialData.length > 0,
  };
};

const normalizeRequirements = (requirementsText) =>
  String(requirementsText || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const getCertificates = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can manage certificates",
    };
  }

  const { data, error } = await supabase
    .from("cetificates")
    .select("id, type, requirements")
    .order("type", { ascending: true });

  if (error) {
    console.error("Error fetching certificates:", error);
    return { success: false, message: "Failed to fetch certificates" };
  }

  return { success: true, data: data || [] };
};

export const insertCertificate = async ({ type, requirementsText }) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can manage certificates",
    };
  }

  const cleanedType = String(type || "").trim();
  const requirements = normalizeRequirements(requirementsText);

  if (!cleanedType) {
    return { success: false, message: "Certificate type is required" };
  }

  const { data, error } = await supabase
    .from("cetificates")
    .insert({
      type: cleanedType,
      requirements,
    })
    .select("id, type, requirements")
    .single();

  if (error) {
    console.error("Error inserting certificate:", error);
    return { success: false, message: "Failed to add certificate" };
  }

  return { success: true, data };
};

export const updateCertificate = async (id, { type, requirementsText }) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can manage certificates",
    };
  }

  const cleanedType = String(type || "").trim();
  const requirements = normalizeRequirements(requirementsText);

  if (!cleanedType) {
    return { success: false, message: "Certificate type is required" };
  }

  const { data, error } = await supabase
    .from("cetificates")
    .update({
      type: cleanedType,
      requirements,
    })
    .eq("id", id)
    .select("id, type, requirements")
    .single();

  if (error) {
    console.error("Error updating certificate:", error);
    return { success: false, message: "Failed to update certificate" };
  }

  return { success: true, data };
};
