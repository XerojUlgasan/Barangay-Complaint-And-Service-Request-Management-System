import supabase from "../supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
} from "../resident/resident";

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
    isOfficial: officialData && officialData.length > 0,
  };
};

export const getAssignedComplaints = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can view assigned complaints
  if (!isOfficial) {
    console.log("Complaint does not exist or you don't have access to it");
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("complaint_tbl")
    .select(
      `
      *,
      official:official_tbl!complaint_tbl_assigned_official_id_fkey (
        firstname,
        lastname,
        role
      )
    `,
    )
    .eq("assigned_official_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assigned complaints:", error);
    return { success: false, message: "Failed to fetch assigned complaints" };
  }

  const complainantAuthUids = [
    ...new Set(data.map((row) => row.complainant_id)),
  ].filter(Boolean);
  const residentsResult = await getResidentsByAuthUids(complainantAuthUids);
  const residentNameMap = residentsResult.success
    ? Object.fromEntries(
        Object.entries(residentsResult.data).map(([authUid, resident]) => [
          authUid,
          formatResidentFullName(resident),
        ]),
      )
    : {};

  const enriched = data.map((complaint) => ({
    ...complaint,
    complainant_name: residentNameMap[complaint.complainant_id] || "Unknown",
    assigned_official_name:
      complaint.official?.firstname && complaint.official?.lastname
        ? `${complaint.official.firstname} ${complaint.official.lastname}`
        : null,
  }));

  return { success: true, data: enriched };
};

export const getAssignedRequests = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can view assigned requests
  if (!isOfficial) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("request_tbl")
    .select(
      `
      *,
      official:official_tbl!request_tbl_assigned_official_id_fkey (
        firstname,
        lastname,
        role
      )
    `,
    )
    .eq("assigned_official_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assigned requests:", error);
    return { success: false, message: "Failed to fetch assigned requests" };
  }

  const requesterAuthUids = [
    ...new Set(data.map((row) => row.requester_id)),
  ].filter(Boolean);
  const residentsResult = await getResidentsByAuthUids(requesterAuthUids);
  const residentNameMap = residentsResult.success
    ? Object.fromEntries(
        Object.entries(residentsResult.data).map(([authUid, resident]) => [
          authUid,
          formatResidentFullName(resident),
        ]),
      )
    : {};

  const enriched = data.map((request) => ({
    ...request,
    requester_name: residentNameMap[request.requester_id] || "Unknown",
    assigned_official_name:
      request.official?.firstname && request.official?.lastname
        ? `${request.official.firstname} ${request.official.lastname}`
        : null,
  }));

  return { success: true, data: enriched };
};

export const updateRequestStatus = async (
  requestId,
  status,
  remarks = null,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can update request status
  if (!isOfficial) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  // Verify the request exists
  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, requester_id, assigned_official_id, request_status")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  // Validate status against allowed enum values
  const validStatuses = [
    "pending",
    "in_progress",
    "completed",
    "rejected",
    "resident_complied",
    "for_compliance",
    "non_compliant",
    "for_validation",
  ];
  if (!validStatuses.includes(status)) {
    console.error(
      `Invalid status value: ${status}. Must be one of: ${validStatuses.join(", ")}`,
    );
    return {
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      request_status: status,
      remarks: remarks,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error updating request:", error);
    return { success: false, message: "Failed to update request" };
  }

  return { success: true, message: "Request updated successfully" };
};

export const updateComplaintStatus = async (
  complaintId,
  status,
  remarks = null,
  priority_level = null,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  // Only officials can update complaint status
  if (!isOfficial) {
    console.log("Complaint does not exist or you don't have access to it");
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  // Verify the complaint exists
  const { data: complaintData } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, assigned_official_id, status")
    .eq("id", complaintId)
    .maybeSingle();

  if (!complaintData) {
    console.log("Complaint does not exist or you don't have access to it");
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  // Validate status against allowed enum values
  const validStatuses = [
    "pending",
    "in_progress",
    "completed",
    "rejected",
    "resident_complied",
    "for_compliance",
    "non_compliant",
    "for_validation",
  ];
  if (status && !validStatuses.includes(status)) {
    console.warn(
      `Status "${status}" may not be valid. Allowed: ${validStatuses.join(", ")}`,
    );
  }

  const updateData = {
    updated_by: userData.user.id,
    updated_at: new Date().toISOString(),
  };

  if (status) updateData.status = status;
  if (remarks) updateData.remarks = remarks;
  if (priority_level) updateData.priority_level = priority_level;

  const { error } = await supabase
    .from("complaint_tbl")
    .update(updateData)
    .eq("id", complaintId);

  if (error) {
    console.error("Error updating complaint:", error);
    return { success: false, message: "Failed to update complaint" };
  }

  return { success: true, message: "Complaint updated successfully" };
};
