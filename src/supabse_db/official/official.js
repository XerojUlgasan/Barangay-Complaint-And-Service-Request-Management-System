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

export const getAssignedComplaints = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can view assigned complaints
  if (!isOfficial) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
    .from("complaint_tbl")
    .select(`
      *,
      member:sample_household_members_tbl!complaint_tbl_complainant_id_fkey (
        firstname,
        lastname,
        middlename
      ),
      official:official_tbl!complaint_tbl_assigned_official_id_fkey (
        firstname,
        lastname,
        role
      )
    `)
    .eq("assigned_official_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assigned complaints:", error);
    return { success: false, message: "Failed to fetch assigned complaints" };
  }

  const enriched = data.map(complaint => ({
    ...complaint,
    complainant_name: complaint.member?.firstname && complaint.member?.lastname
      ? `${complaint.member.firstname} ${complaint.member.lastname}`
      : "Unknown",
    assigned_official_name: complaint.official?.firstname && complaint.official?.lastname
      ? `${complaint.official.firstname} ${complaint.official.lastname}`
      : null
  }));

  return { success: true, data: enriched };
};

export const getAssignedRequests = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can view assigned requests
  if (!isOfficial) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  const { data, error } = await supabase
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
    .eq("assigned_official_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assigned requests:", error);
    return { success: false, message: "Failed to fetch assigned requests" };
  }

  const enriched = data.map(request => ({
    ...request,
    requester_name: request.member?.firstname && request.member?.lastname
      ? `${request.member.firstname} ${request.member.lastname}`
      : "Unknown",
    assigned_official_name: request.official?.firstname && request.official?.lastname
      ? `${request.official.firstname} ${request.official.lastname}`
      : null
  }));

  return { success: true, data: enriched };
};

export const updateRequestStatus = async (requestId, status, remarks = null) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can update request status
  if (!isOfficial) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  // Verify the official is actually assigned to this request
  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, assigned_official_id")
    .eq("id", requestId)
    .eq("assigned_official_id", userData.user.id)
    .maybeSingle();

  if (!requestData) {
    console.log("Request does not exist or you don't have access to it");
    return { success: false, message: "Request does not exist or you don't have access to it" };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      request_status: status,
      remarks: remarks,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id
    })
    .eq("id", requestId)
    .eq("assigned_official_id", userData.user.id);

  if (error) {
    console.error("Error updating request:", error);
    return { success: false, message: "Failed to update request" };
  }

  // Insert history record
  await supabase
    .from("request_history_tbl")
    .insert({
      request_id: requestId,
      requester_id: requestData.requester_id,
      request_status: status,
      remarks: remarks,
      updater_id: userData.user.id,
      updated_at: new Date().toISOString()
    });

  return { success: true, message: "Request updated successfully" };
};

export const updateComplaintStatus = async (complaintId, status, remarks = null, priority_level = null) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can update complaint status
  if (!isOfficial) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  // Verify the official is actually assigned to this complaint
  const { data: complaintData } = await supabase
    .from("complaint_tbl")
    .select("id, assigned_official_id, complainant_id")
    .eq("id", complaintId)
    .eq("assigned_official_id", userData.user.id)
    .maybeSingle();

  if (!complaintData) {
    console.log("Complaint does not exist or you don't have access to it");
    return { success: false, message: "Complaint does not exist or you don't have access to it" };
  }

  const { error } = await supabase
    .from("complaint_tbl")
    .update({
      status: status,
      remarks: remarks,
      priority_level: priority_level,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", complaintId)
    .eq("assigned_official_id", userData.user.id);

  if (error) {
    console.error("Error updating complaint:", error);
    return { success: false, message: "Failed to update complaint" };
  }

  // Insert history record
  await supabase
    .from("complaint_history_tbl")
    .insert({
      complaint_id: complaintId,
      complainant_id: complaintData.complainant_id,
      status: status,
      priority_level: priority_level,
      remarks: remarks,
      updater_id: userData.user.id,
      updated_at: new Date().toISOString()
    });

  return { success: true, message: "Complaint updated successfully" };
};