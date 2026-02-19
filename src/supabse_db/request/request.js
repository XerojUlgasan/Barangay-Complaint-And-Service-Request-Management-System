import supabase from "../supabase_client";

// Helper function to check user role without causing 406 errors
const checkUserRole = async (userId) => {
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userId);
  
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userId);

  return {
    isSuperAdmin: superadminData && superadminData.length > 0,
    isOfficial: officialData && officialData.length > 0
  };
};

export const insertRequest = async (subj, desc, cert_type) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  console.log(userData);
  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  // Check if user is official or superadmin - they cannot insert requests
  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return { success: false, message: "Officials and superadmin cannot insert requests" };
  }

  const { data, error } = await supabase
    .from("request_tbl")
    .insert({
      subject: subj,
      description: desc,
      certificate_type: cert_type,
    })
    .select()
    .single();

  if (error) {
    console.error("Insert request error:", error);
    return { success: false, message: error.message };
  }

  console.log("Request inserted:", data);
  return { success: true, data };
};

export const getRequests = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  let query = supabase
    .from("request_tbl")
    .select(`
      *,
      member:sample_household_members_tbl!request_tbl_user_id_fkey (
        firstname,
        lastname,
        middlename
      ),
      official:official_tbl!request_tbl_assigned_official_id_fkey (
        firstname,
        lastname,
        role
      )
    `)
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only view their own requests
    query = query.eq("requester_id", userData.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requests:", error);
    return { success: false, message: "Failed to fetch requests" };
  }

  const enriched = data.map((request) => ({
    ...request,
    requester_name:
      request.member?.firstname && request.member?.lastname
        ? `${request.member.firstname} ${request.member.lastname}`
        : "Unknown",
    assigned_official_name:
      request.official?.firstname && request.official?.lastname
        ? `${request.official.firstname} ${request.official.lastname}`
        : null,
  }));

  return { success: true, data: enriched };
};

export const getRequestById = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // First check if request exists at all (without ownership filters)
  const { data: requestExists } = await supabase
    .from("request_tbl")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestExists) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  // Now check if user has access to this request
  let query = supabase
    .from("request_tbl")
    .select(`
      *,
      member:sample_household_members_tbl!request_tbl_user_id_fkey (
        firstname,
        lastname,
        middlename
      ),
      official:official_tbl!request_tbl_assigned_official_id_fkey (
        firstname,
        lastname,
        role
      )
    `)
    .eq("id", requestId);

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only view their own requests
    query = query.eq("requester_id", userData.user.id);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching request:", error);
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  if (!data) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  return {
    success: true,
    data: {
      ...data,
      requester_name:
        data.member?.firstname && data.member?.lastname
          ? `${data.member.firstname} ${data.member.lastname}`
          : "Unknown",
      assigned_official_name:
        data.official?.firstname && data.official?.lastname
          ? `${data.official.firstname} ${data.official.lastname}`
          : null,
    },
  };
};

export const deleteRequest = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return { success: false, message: "Officials and superadmin cant delete requests" };
  }

  // Check if request exists and is owned by the resident
  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, requester_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  if (requestData.requester_id !== userData.user.id) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  const { error } = await supabase
    .from("request_tbl")
    .delete()
    .eq("id", requestId)
    .eq("requester_id", userData.user.id);

  if (error) {
    console.error("Error deleting request:", error);
    return { success: false, message: "Failed to delete request" };
  }

  return { success: true, message: "Request deleted successfully" };
};

export const getRequestHistory = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // First check if request exists at all (without ownership filters)
  const { data: requestExists } = await supabase
    .from("request_tbl")
    .select("id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestExists) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  // Now verify user has access to this request
  let accessQuery = supabase
    .from("request_tbl")
    .select("id, requester_id")
    .eq("id", requestId);

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only access their own request history
    accessQuery = accessQuery.eq("requester_id", userData.user.id);
  }

  const { data: accessData } = await accessQuery.maybeSingle();

  if (!accessData) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("request_history_tbl")
    .select(`
      *,
      updater:official_tbl!request_history_tbl_updater_id_fkey (
        firstname,
        lastname,
        role
      )
    `)
    .eq("request_id", requestId)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Error fetching request history:", error);
    return { success: false, message: "Failed to fetch request history" };
  }

  const enriched = data.map((history) => ({
    ...history,
    updater_name:
      history.updater?.firstname && history.updater?.lastname
        ? `${history.updater.firstname} ${history.updater.lastname}`
        : "System",
  }));

  return { success: true, data: enriched };
};