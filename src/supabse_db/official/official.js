import supabase from "../supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
  getResidentsByIds,
} from "../resident/resident";

// Helper function to check user role without causing 406 errors
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

const normalizeComplaintValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const getLatestMediationStatusForComplaint = async (complaintId) => {
  const { data, error } = await supabase
    .from("mediations_tbl")
    .select("status")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    status: normalizeComplaintValue(data?.status),
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
      official:barangay_officials!complaint_tbl_assigned_official_id_fkey (
        first_name,
        last_name,
        position
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
  const residentsResult = await getResidentsByAuthUids(complainantAuthUids, {
    forceRefresh: true,
  });
  const residentNameMap = residentsResult.success
    ? Object.fromEntries(
        Object.entries(residentsResult.data).map(([authUid, resident]) => [
          authUid,
          formatResidentFullName(resident),
        ]),
      )
    : {};

  // Resolve respondent identifiers whether they are stored as auth UIDs or resident IDs.
  const allRespondentIds = [
    ...new Set(
      data.flatMap((row) =>
        Array.isArray(row.respondent_id) ? row.respondent_id : [],
      ),
    ),
  ].filter(Boolean);
  const [respondentsByAuthUidResult, respondentsByIdResult] = await Promise.all(
    [
      getResidentsByAuthUids(allRespondentIds),
      getResidentsByIds(allRespondentIds),
    ],
  );
  const respondentNameMap = {
    ...(respondentsByAuthUidResult.success
      ? Object.fromEntries(
          Object.entries(respondentsByAuthUidResult.data).map(
            ([authUid, resident]) => [
              authUid,
              formatResidentFullName(resident),
            ],
          ),
        )
      : {}),
    ...(respondentsByIdResult.success
      ? Object.fromEntries(
          Object.entries(respondentsByIdResult.data).map(([id, resident]) => [
            id,
            formatResidentFullName(resident),
          ]),
        )
      : {}),
  };

  const enriched = data.map((complaint) => ({
    ...complaint,
    complainant_name: residentNameMap[complaint.complainant_id] || "Unknown",
    assigned_official_name:
      complaint.official?.first_name && complaint.official?.last_name
        ? `${complaint.official.first_name} ${complaint.official.last_name}`
        : null,
    // Attach respondents as a joined string for UI consumption
    respondent_names: (complaint.respondent_id || [])
      .map((rid) => respondentNameMap[rid] || rid)
      .join(", "),
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
      official:barangay_officials!request_tbl_assigned_official_id_fkey (
        first_name,
        last_name,
        position
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
  const residentsResult = await getResidentsByAuthUids(requesterAuthUids, {
    forceRefresh: true,
  });
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
      request.official?.first_name && request.official?.last_name
        ? `${request.official.first_name} ${request.official.last_name}`
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

  const latestMediationStatusResult =
    await getLatestMediationStatusForComplaint(complaintId);

  if (!latestMediationStatusResult.success) {
    return {
      success: false,
      message: "Failed to validate mediation status before complaint update",
    };
  }

  if (["resolved", "rejected"].includes(latestMediationStatusResult.status)) {
    return {
      success: false,
      message:
        "This complaint is connected to a closed mediation and can no longer be modified.",
    };
  }

  // Validate status against allowed enum values
  const validStatuses = [
    "for review",
    "rejected",
    "resolved",
    "recorded",
    "pending",
  ];
  const normalizedStatus = normalizeComplaintValue(status);
  if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
    console.warn(
      `Status "${status}" may not be valid. Allowed: ${validStatuses.join(", ")}`,
    );
  }

  const updateData = {
    updated_by: userData.user.id,
    updated_at: new Date().toISOString(),
  };

  if (normalizedStatus) updateData.status = normalizedStatus;
  if (remarks !== undefined) updateData.remarks = remarks;
  if (priority_level !== undefined) updateData.priority_level = priority_level;

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

export const updateComplaintCategory = async (complaintId, category) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  if (!isOfficial) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const { data: complaintData } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, assigned_official_id, category, status")
    .eq("id", complaintId)
    .maybeSingle();

  if (!complaintData) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const latestMediationStatusResult =
    await getLatestMediationStatusForComplaint(complaintId);

  if (!latestMediationStatusResult.success) {
    return {
      success: false,
      message: "Failed to validate mediation status before complaint update",
    };
  }

  if (["resolved", "rejected"].includes(latestMediationStatusResult.status)) {
    return {
      success: false,
      message:
        "This complaint is connected to a closed mediation and can no longer be modified.",
    };
  }

  const validCategories = [
    "community concern",
    "barangay complaint",
    "community dispute",
    "personal complaint",
  ];
  const normalizedCategory = normalizeComplaintValue(category);

  if (!validCategories.includes(normalizedCategory)) {
    return {
      success: false,
      message: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
    };
  }

  const { error } = await supabase
    .from("complaint_tbl")
    .update({
      category: normalizedCategory,
      status: complaintData.status,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", complaintId);

  if (error) {
    console.error("Error updating complaint category:", error);
    return { success: false, message: "Failed to update complaint category" };
  }

  return { success: true, message: "Complaint category updated successfully" };
};

export const getActiveOfficialsForAssignment = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can view transferable active officials",
    };
  }

  const { data, error } = await supabase
    .from("barangay_officials")
    .select("official_id, uid, first_name, last_name, position, status")
    .eq("status", "ACTIVE")
    .not("uid", "is", null)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching active officials:", error);
    return { success: false, message: "Failed to fetch active officials" };
  }

  return { success: true, data: data || [] };
};
