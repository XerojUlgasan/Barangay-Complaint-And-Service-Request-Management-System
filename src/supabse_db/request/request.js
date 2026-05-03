import supabase from "../supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
} from "../resident/resident";
import { assignAllUnassignedByTable } from "../utils/autoAssign";
import { isSamePhilippineCalendarDay } from "../../utils/philippineTime";

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

const normalizeTextValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const fetchResidentRequestsForDayChecks = async (userId) => {
  const { data, error } = await supabase
    .from("request_tbl")
    .select("id, requester_id, certificate_type, request_status, created_at")
    .eq("requester_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data: Array.isArray(data) ? data : [] };
};

const checkResidentRequestLimits = async (userId, certType) => {
  const residentRequestsResult =
    await fetchResidentRequestsForDayChecks(userId);

  if (!residentRequestsResult.success) {
    return residentRequestsResult;
  }

  const today = new Date();
  const todaysRequests = residentRequestsResult.data.filter((request) =>
    isSamePhilippineCalendarDay(request.created_at, today),
  );

  if (todaysRequests.length >= 3) {
    return {
      success: false,
      message: "You can only file up to 3 requests per day.",
    };
  }

  const normalizedCertificateType = normalizeTextValue(certType);
  if (!normalizedCertificateType) {
    return { success: true };
  }

  const hasSameCertificateType = todaysRequests.some((request) => {
    const sameCertificateType =
      normalizeTextValue(request.certificate_type) ===
      normalizedCertificateType;
    const isRejected =
      normalizeTextValue(request.request_status) === "rejected";
    return sameCertificateType && !isRejected;
  });

  if (hasSameCertificateType) {
    return {
      success: false,
      message:
        "You already filed this certificate type today. You can only submit another after the previous one is rejected.",
    };
  }

  return { success: true };
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
    return {
      success: false,
      message: "Officials and superadmin cannot insert requests",
    };
  }

  const limitResult = await checkResidentRequestLimits(
    userData.user.id,
    cert_type,
  );

  if (!limitResult.success) {
    return limitResult;
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

  console.log("getRequests: auth user id=", userData.user.id);
  try {
    console.log(
      "getRequests: roles =>",
      JSON.stringify({ isSuperAdmin, isOfficial }),
    );
  } catch (e) {
    console.log("getRequests: roles =>", { isSuperAdmin, isOfficial });
  }

  // First try a simple query without joins to check if data exists
  const { data: simpleData, error: simpleError } = await supabase
    .from("request_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  console.log(
    "getRequests: Simple query (no joins) returned:",
    simpleData ? simpleData.length : 0,
    "records",
  );
  if (simpleData && simpleData.length > 0) {
    console.log("getRequests: First record:", simpleData[0]);
  }
  if (simpleError) {
    console.error("getRequests: Simple query error:", simpleError);
    console.error("getRequests: Error code:", simpleError.code);
    console.error("getRequests: Error message:", simpleError.message);
  }

  // Now try with joins
  let query = supabase
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
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only view their own requests
    query = query.eq("requester_id", userData.user.id);
  }

  // Log whether we are applying requester filter
  if (!isSuperAdmin && !isOfficial) {
    console.log(
      "getRequests: applying requester_id filter for",
      userData.user.id,
    );
  } else {
    console.log(
      "getRequests: no requester_id filter applied (superadmin/official)",
    );
  }

  const { data, error } = await query;

  try {
    console.log(
      "getRequests: query returned:",
      Array.isArray(data) ? data.length : typeof data,
      JSON.stringify(
        Array.isArray(data) && data.length > 0 ? data.slice(0, 5) : data,
      ),
    );
  } catch (e) {
    console.log(
      "getRequests: query returned:",
      Array.isArray(data) ? data.length : typeof data,
      data && data.slice ? data.slice(0, 5) : data,
    );
  }

  if (error) {
    console.error("Error fetching requests:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    // If join fails, fall back to simple query
    if (simpleData && simpleData.length > 0) {
      console.log("getRequests: Join failed, returning simple query results");
      const enriched = simpleData.map((request) => ({
        ...request,
        requester_name: "Unknown",
        assigned_official_name: null,
      }));
      return { success: true, data: enriched };
    }
    return { success: false, message: "Failed to fetch requests" };
  }

  console.log("getRequests: No error, data is:", data);
  console.log(
    "getRequests: Raw data preview:",
    data && data.length > 0 ? data[0] : "No data",
  );

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
      request.official?.first_name && request.official?.last_name
        ? `${request.official.first_name} ${request.official.last_name}`
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
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  // Now check if user has access to this request
  let query = supabase
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
    .eq("id", requestId);

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only view their own requests
    query = query.eq("requester_id", userData.user.id);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching request:", error);
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  if (!data) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  const residentsResult = await getResidentsByAuthUids([data.requester_id]);
  const requesterName = residentsResult.success
    ? formatResidentFullName(residentsResult.data[data.requester_id]) ||
      "Unknown"
    : "Unknown";

  return {
    success: true,
    data: {
      ...data,
      requester_name: requesterName,
      assigned_official_name:
        data.official?.first_name && data.official?.last_name
          ? `${data.official.first_name} ${data.official.last_name}`
          : null,
    },
  };
};

export const markRequestResidentComplied = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return {
      success: false,
      message: "Officials and superadmin cannot submit compliance",
    };
  }

  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, requester_id, request_status")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData || requestData.requester_id !== userData.user.id) {
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  const normalizedCurrentStatus = String(requestData.request_status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

  if (normalizedCurrentStatus !== "for compliance") {
    return {
      success: false,
      message: "Only requests with for compliance status can submit compliance",
    };
  }

  const { error: rpcError } = await supabase.rpc("set_request_compliant", {
    request_id: requestId,
  });

  if (rpcError) {
    console.warn(
      "set_request_compliant RPC failed, continuing with direct pending update:",
      rpcError,
    );
  }

  const { error: updateError } = await supabase
    .from("request_tbl")
    .update({
      request_status: "pending",
      updated_at: new Date().toISOString(),
      updated_by: null,
    })
    .eq("id", requestId)
    .eq("requester_id", userData.user.id);

  if (updateError) {
    console.error(
      "Error forcing pending status after compliance upload:",
      updateError,
    );
    return {
      success: false,
      message: "Failed to set request status to pending",
    };
  }

  const { data: updatedRequest, error: fetchError } = await supabase
    .from("request_tbl")
    .select("request_status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching updated request status:", fetchError);
    return {
      success: false,
      message: "Status updated but failed to verify new request status",
    };
  }

  const updatedStatus = updatedRequest?.request_status;
  const normalizedStatus = String(updatedStatus || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus !== "pending") {
    return {
      success: false,
      message: "Compliance was submitted but request status was not updated",
    };
  }

  return {
    success: true,
    message: "Compliance submitted and request status set to pending",
    status: updatedStatus,
  };
};

export const deleteRequest = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return {
      success: false,
      message: "Officials and superadmin cant delete requests",
    };
  }

  // Check if request exists and is owned by the resident
  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, requester_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  if (requestData.requester_id !== userData.user.id) {
    console.log("Request does not exist or you don't have access to it");
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
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
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
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
    return {
      success: false,
      message: "Request does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("request_history_tbl")
    .select(
      `
      *,
      updater:barangay_officials!request_history_tbl_updater_id_fkey (
        first_name,
        last_name,
        position
      )
    `,
    )
    .eq("request_id", requestId)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Error fetching request history:", error);
    return { success: false, message: "Failed to fetch request history" };
  }

  const enriched = data.map((history) => ({
    ...history,
    updater_name:
      history.updater?.first_name && history.updater?.last_name
        ? `${history.updater.first_name} ${history.updater.last_name}`
        : "System",
  }));

  return { success: true, data: enriched };
};

export const assignAllUnassignedRequests = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin && !isOfficial) {
    return {
      success: false,
      message: "Only officials or superadmin can assign requests",
    };
  }

  return assignAllUnassignedByTable("request_tbl", "request_status");
};

export const transferRequestAssignment = async (requestId, newOfficialUid) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can transfer request assignments",
    };
  }

  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, assigned_official_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    return { success: false, message: "Request not found" };
  }

  if (requestData.assigned_official_id === newOfficialUid) {
    return {
      success: false,
      message: "Selected official is already assigned to this request",
    };
  }

  const { data: officialData, error: officialError } = await supabase
    .from("barangay_officials")
    .select("uid, first_name, last_name, status")
    .eq("uid", newOfficialUid)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (officialError || !officialData) {
    return { success: false, message: "Selected official is not ACTIVE" };
  }

  // request_tbl.updated_by references barangay_officials.uid, so only official UIDs are valid here.
  const { data: actorOfficial } = await supabase
    .from("barangay_officials")
    .select("uid")
    .eq("uid", userData.user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("request_tbl")
    .update({
      assigned_official_id: newOfficialUid,
      updated_at: new Date().toISOString(),
      updated_by: actorOfficial?.uid || null,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error transferring request assignment:", error);
    return { success: false, message: "Failed to transfer request assignment" };
  }

  return {
    success: true,
    message: "Request assignment transferred successfully",
    assignedOfficialName: `${officialData.first_name} ${officialData.last_name}`,
  };
};

export const claimRequest = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  if (!isOfficial) {
    return {
      success: false,
      message: "Only officials can claim requests",
    };
  }

  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, assigned_official_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    return { success: false, message: "Request not found" };
  }

  if (requestData.assigned_official_id) {
    return {
      success: false,
      message: "Request is already assigned to an official",
    };
  }

  const { data: officialData, error: officialError } = await supabase
    .from("barangay_officials")
    .select("uid, first_name, last_name, status")
    .eq("uid", userData.user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (officialError || !officialData) {
    return { success: false, message: "You are not an active official" };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      assigned_official_id: userData.user.id,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id,
    })
    .eq("id", requestId)
    .is("assigned_official_id", null);

  if (error) {
    console.error("Error claiming request:", error);
    return { success: false, message: "Failed to claim request" };
  }

  return {
    success: true,
    message: "Request claimed successfully",
    assignedOfficialName: `${officialData.first_name} ${officialData.last_name}`,
  };
};

export const unclaimRequest = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  if (!isOfficial) {
    return {
      success: false,
      message: "Only officials can unclaim requests",
    };
  }

  const { data: requestData } = await supabase
    .from("request_tbl")
    .select("id, assigned_official_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestData) {
    return { success: false, message: "Request not found" };
  }

  if (requestData.assigned_official_id !== userData.user.id) {
    return {
      success: false,
      message: "You can only unclaim requests assigned to you",
    };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      assigned_official_id: null,
      updated_at: new Date().toISOString(),
      updated_by: userData.user.id,
    })
    .eq("id", requestId)
    .eq("assigned_official_id", userData.user.id);

  if (error) {
    console.error("Error unclaiming request:", error);
    return { success: false, message: "Failed to unclaim request" };
  }

  return {
    success: true,
    message: "Request unclaimed successfully",
  };
};
