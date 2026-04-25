import supabase from "../supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
} from "../resident/resident";
import { assignAllUnassignedByTable } from "../utils/autoAssign";
import {
  parseDbTimestamp,
  philippineDateTimeLocalToUtcIso,
} from "../../utils/philippineTime";

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

const MEDIATION_STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "#0ea5e9" },
  unresolved: { label: "Unresolved", color: "#f59e0b" },
  rejected: { label: "Rejected", color: "#ef4444" },
  rescheduled: { label: "Rescheduled", color: "#14b8a6" },
  resolved: { label: "Resolved", color: "#10b981" },
};

const MEDIATION_ACTIVE_STATUSES = ["scheduled", "rescheduled"];
const MEDIATION_FINAL_STATUSES = ["resolved", "rejected"];
const MEDIATION_ROLLOVER_STATUSES = ["unresolved", "rescheduled"];
const COMPLAINT_ASSIGNABLE_STATUSES = ["pending", "for review", "recorded"];

const normalizeMediationStatus = (value) => normalizeComplaintValue(value);

const formatMediationStatusLabel = (status) => {
  const value = normalizeMediationStatus(status);

  if (!value) {
    return "Scheduled";
  }

  return (
    MEDIATION_STATUS_CONFIG[value]?.label ||
    value.replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const getMediationStatusColor = (status) => {
  const value = normalizeMediationStatus(status);
  return MEDIATION_STATUS_CONFIG[value]?.color || "#6b7280";
};

const isValidMediationRange = (sessionStart, sessionEnd) => {
  const startDate = parseDbTimestamp(sessionStart, {
    assumeUtcForNaive: false,
  });
  const endDate = parseDbTimestamp(sessionEnd, { assumeUtcForNaive: false });

  return (
    sessionStart &&
    sessionEnd &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    endDate > startDate
  );
};

const isMediationOverlap = (leftStart, leftEnd, rightStart, rightEnd) => {
  const leftStartDate = parseDbTimestamp(leftStart, {
    assumeUtcForNaive: false,
  });
  const leftEndDate = parseDbTimestamp(leftEnd, { assumeUtcForNaive: false });
  const rightStartDate = parseDbTimestamp(rightStart, {
    assumeUtcForNaive: false,
  });
  const rightEndDate = parseDbTimestamp(rightEnd, { assumeUtcForNaive: false });

  return (
    Boolean(leftStartDate) &&
    Boolean(leftEndDate) &&
    Boolean(rightStartDate) &&
    Boolean(rightEndDate) &&
    leftStartDate < rightEndDate &&
    leftEndDate > rightStartDate
  );
};

const normalizeMediationDateInput = (value) => {
  if (!value) return null;
  const converted = philippineDateTimeLocalToUtcIso(value);
  return converted || null;
};

const getLatestMediationSession = async (complaintId) => {
  const { data, error } = await supabase
    .from("settlement_tbl")
    .select("id, complaint_id, session_start, session_end, status, created_at")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data: data?.[0] || null };
};

export const getActiveMediationSessions = async (excludeComplaintId = null) => {
  const { data, error } = await supabase
    .from("settlement_tbl")
    .select("id, complaint_id, session_start, session_end, status, created_at")
    .in("status", MEDIATION_ACTIVE_STATUSES)
    .order("session_start", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching active mediation sessions:", error);
    return { success: false, message: "Failed to fetch mediation sessions" };
  }

  const filtered = (data || []).filter(
    (session) =>
      !excludeComplaintId ||
      String(session.complaint_id) !== String(excludeComplaintId),
  );

  return {
    success: true,
    data: filtered.map((session) => ({
      ...session,
      status_label: formatMediationStatusLabel(session.status),
      status_color: getMediationStatusColor(session.status),
    })),
  };
};

export const getMediationConflictSessions = async ({
  sessionStart,
  sessionEnd,
  excludeComplaintId = null,
} = {}) => {
  if (!isValidMediationRange(sessionStart, sessionEnd)) {
    return { success: false, message: "Invalid mediation session range" };
  }

  const activeSessionsResult =
    await getActiveMediationSessions(excludeComplaintId);

  if (!activeSessionsResult.success) {
    return activeSessionsResult;
  }

  const conflicts = activeSessionsResult.data.filter((session) =>
    isMediationOverlap(
      sessionStart,
      sessionEnd,
      session.session_start,
      session.session_end,
    ),
  );

  return {
    success: true,
    data: conflicts,
  };
};

export const insertComplaint = async (
  type,
  inci_date,
  inci_loc,
  desc,
  respondent_ids = null,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  // Check if user is official or superadmin - they cannot insert complaints
  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return {
      success: false,
      message: "Officials and superadmin cannot insert complaints",
    };
  }

  const { data, error } = await supabase
    .from("complaint_tbl")
    .insert({
      complaint_type: type,
      incident_date: inci_date,
      incident_location: inci_loc,
      description: desc,
      respondent_id:
        respondent_ids && respondent_ids.length > 0 ? respondent_ids : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert complaint error:", error);
    return { success: false, message: error.message };
  }

  console.log("Complaint inserted:", data);
  return { success: true, data };
};

export const getComplaints = async (options = {}) => {
  const { userId: providedUserId = null, userRole: providedUserRole = null } =
    options;

  let userId = providedUserId;
  let userRole = providedUserRole;

  if (!userId) {
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData || !userData.user) {
      console.log("No authenticated user found.");
      return { success: false, message: "Not authenticated" };
    }

    userId = userData.user.id;
  }

  if (!userRole) {
    const { isSuperAdmin, isOfficial } = await checkUserRole(userId);
    if (isSuperAdmin) userRole = "superadmin";
    else if (isOfficial) userRole = "official";
    else userRole = "resident";
  }

  let query = supabase
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
    .order("created_at", { ascending: false });

  if (userRole === "superadmin" || userRole === "official") {
    // Officials and superadmin can view all complaints
  } else {
    // Residents can view only their own complaints
    query = query.eq("complainant_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching complaints:", error);
    return { success: false, message: "Failed to fetch complaints" };
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
      complaint.official?.first_name && complaint.official?.last_name
        ? `${complaint.official.first_name} ${complaint.official.last_name}`
        : null,
  }));

  return { success: true, data: enriched };
};

export const getComplaintsAgainstResident = async (options = {}) => {
  const { userId: providedUserId = null } = options;

  let userId = providedUserId;

  if (!userId) {
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData || !userData.user) {
      return { success: false, message: "Not authenticated" };
    }

    userId = userData.user.id;
  }

  const baseSelect = `
      *,
      official:barangay_officials!complaint_tbl_assigned_official_id_fkey (
        first_name,
        last_name,
        position
      )
    `;

  const containsResult = await supabase
    .from("complaint_tbl")
    .select(baseSelect)
    .contains("respondent_id", [userId])
    .order("created_at", { ascending: false });

  let rows = containsResult.data || [];
  let lastError = containsResult.error || null;

  if (rows.length === 0) {
    const pgArray = `{"${userId}"}`;
    const csResult = await supabase
      .from("complaint_tbl")
      .select(baseSelect)
      .filter("respondent_id", "cs", pgArray)
      .order("created_at", { ascending: false });

    if (!csResult.error && Array.isArray(csResult.data)) {
      rows = csResult.data;
      lastError = null;
    } else if (csResult.error) {
      lastError = csResult.error;
    }
  }

  if (rows.length === 0) {
    const { data: registrations, error: registrationError } = await supabase
      .from("registered_residents")
      .select("id")
      .eq("auth_uid", userId)
      .limit(1);

    if (!registrationError && registrations?.[0]?.id) {
      const residentId = registrations[0].id;
      const byIdContainsResult = await supabase
        .from("complaint_tbl")
        .select(baseSelect)
        .contains("respondent_id", [residentId])
        .order("created_at", { ascending: false });

      if (!byIdContainsResult.error && Array.isArray(byIdContainsResult.data)) {
        rows = byIdContainsResult.data;
      } else {
        const byIdPgArray = `{"${residentId}"}`;
        const byIdCsResult = await supabase
          .from("complaint_tbl")
          .select(baseSelect)
          .filter("respondent_id", "cs", byIdPgArray)
          .order("created_at", { ascending: false });

        if (!byIdCsResult.error && Array.isArray(byIdCsResult.data)) {
          rows = byIdCsResult.data;
        } else if (byIdCsResult.error) {
          lastError = byIdCsResult.error;
        }
      }
    } else if (registrationError) {
      lastError = registrationError;
    }
  }

  if (lastError) {
    console.error("Error fetching complaints against resident:", lastError);
    return {
      success: false,
      message:
        lastError.message ||
        "Failed to fetch complaints against resident. Check RLS policy for respondent access.",
    };
  }

  const complainantAuthUids = [
    ...new Set(rows.map((row) => row.complainant_id)),
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

  const enriched = rows.map((complaint) => ({
    ...complaint,
    complainant_name: residentNameMap[complaint.complainant_id] || "Unknown",
    assigned_official_name:
      complaint.official?.first_name && complaint.official?.last_name
        ? `${complaint.official.first_name} ${complaint.official.last_name}`
        : null,
  }));

  return { success: true, data: enriched };
};

const hasResidentComplaintAccess = (complaint, residentAuthUid) => {
  if (!complaint || !residentAuthUid) return false;

  if (String(complaint.complainant_id) === String(residentAuthUid)) {
    return true;
  }

  const respondents = Array.isArray(complaint.respondent_id)
    ? complaint.respondent_id
    : [];

  return respondents.some(
    (respondentUid) => String(respondentUid) === String(residentAuthUid),
  );
};

export const getComplaintById = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  let query = supabase
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
    .eq("id", complaintId);

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only view their own complaints
    query = query.eq("complainant_id", userData.user.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Error fetching complaint:", error);
    return { success: false, message: "Failed to fetch complaint" };
  }

  if (!data) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const residentsResult = await getResidentsByAuthUids([data.complainant_id]);
  const complainantName = residentsResult.success
    ? formatResidentFullName(residentsResult.data[data.complainant_id]) ||
      "Unknown"
    : "Unknown";

  return {
    success: true,
    data: {
      ...data,
      complainant_name: complainantName,
      assigned_official_name:
        data.official?.first_name && data.official?.last_name
          ? `${data.official.first_name} ${data.official.last_name}`
          : null,
    },
  };
};

export const deleteComplaint = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (isSuperAdmin || isOfficial) {
    return {
      success: false,
      message: "Officials and superadmin cant delete complaints",
    };
  }

  // Check if complaint exists and is owned by the resident
  const { data: complaintData } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id")
    .eq("id", complaintId)
    .maybeSingle();

  if (!complaintData) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  if (complaintData.complainant_id !== userData.user.id) {
    return {
      success: false,
      message: "Complaint is not owned by the logged in resident",
    };
  }

  const { error } = await supabase
    .from("complaint_tbl")
    .delete()
    .eq("id", complaintId)
    .eq("complainant_id", userData.user.id);

  if (error) {
    console.error("Error deleting complaint:", error);
    return { success: false, message: "Failed to delete complaint" };
  }

  return { success: true, message: "Complaint deleted successfully" };
};

export const getComplaintHistory = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  const { data: accessData } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, respondent_id")
    .eq("id", complaintId)
    .maybeSingle();

  const canAccess =
    Boolean(accessData) &&
    (isSuperAdmin ||
      isOfficial ||
      hasResidentComplaintAccess(accessData, userData.user.id));

  if (!canAccess) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("complaint_history_tbl")
    .select(
      `
      *,
      updater:barangay_officials!complaint_history_tbl_updater_id_fkey (
        first_name,
        last_name,
        position
      )
    `,
    )
    .eq("complaint_id", complaintId)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Error fetching complaint history:", error);
    return { success: false, message: "Failed to fetch complaint history" };
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

export const updateComplaintMediationAccepted = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: complaintData, error: complaintError } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, category, mediation_accepted")
    .eq("id", complaintId)
    .maybeSingle();

  if (complaintError) {
    console.error(
      "Error fetching complaint for mediation update:",
      complaintError,
    );
    return { success: false, message: "Failed to update mediation request" };
  }

  if (!complaintData || complaintData.complainant_id !== userData.user.id) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const { error } = await supabase
    .from("complaint_tbl")
    .update({
      mediation_accepted: true,
      status: "for review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", complaintId)
    .eq("complainant_id", userData.user.id)
    .eq("mediation_accepted", false);

  if (error) {
    console.error("Error accepting complaint mediation:", error);
    return { success: false, message: "Failed to accept mediation request" };
  }

  return {
    success: false,
    message: "Mediation workflow has been removed.",
  };
};

export const getComplaintMediationHistory = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  const { data: accessData } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, respondent_id, assigned_official_id")
    .eq("id", complaintId)
    .maybeSingle();

  const canAccess =
    Boolean(accessData) &&
    (isSuperAdmin ||
      isOfficial ||
      hasResidentComplaintAccess(accessData, userData.user.id));

  if (!canAccess) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  const { data, error } = await supabase
    .from("settlement_tbl")
    .select("id, complaint_id, created_at, session_start, session_end, status")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching mediation history:", error);
    return { success: false, message: "Failed to fetch mediation history" };
  }

  return {
    success: true,
    data: (data || []).map((mediation) => ({
      ...mediation,
      status_label: formatMediationStatusLabel(mediation.status),
      status_color: getMediationStatusColor(mediation.status),
    })),
  };
};

const getComplaintAccessForOfficialAction = async (complaintId) => {
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

  const { data: complaintData, error } = await supabase
    .from("complaint_tbl")
    .select(
      "id, complainant_id, assigned_official_id, category, mediation_accepted, status",
    )
    .eq("id", complaintId)
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  if (!complaintData) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  if (complaintData.assigned_official_id !== userData.user.id) {
    return {
      success: false,
      message: "Complaint does not exist or you don't have access to it",
    };
  }

  return {
    success: true,
    userId: userData.user.id,
    complaintData,
  };
};

const buildMediationSessionPayload = ({
  complaintId,
  status,
  sessionStart,
  sessionEnd,
}) => ({
  complaint_id: complaintId,
  status: normalizeMediationStatus(status),
  session_start: sessionStart,
  session_end: sessionEnd,
});

export const createComplaintMediationSession = async ({
  complaintId,
  sessionStart,
  sessionEnd,
}) => {
  void complaintId;
  void sessionStart;
  void sessionEnd;
  return { success: false, message: "Mediation workflow has been removed." };
};

export const updateComplaintMediationStatus = async ({
  complaintId,
  status,
  sessionStart = null,
  sessionEnd = null,
}) => {
  const accessResult = await getComplaintAccessForOfficialAction(complaintId);

  if (!accessResult.success) {
    return accessResult;
  }

  const complaintData = accessResult.complaintData;
  const normalizedStatus = normalizeMediationStatus(status);
  const validStatuses = [
    "scheduled",
    "resolved",
    "unresolved",
    "rejected",
    "rescheduled",
  ];

  if (!validStatuses.includes(normalizedStatus)) {
    return {
      success: false,
      message: `Invalid mediation status. Must be one of: ${validStatuses.join(", ")}`,
    };
  }

  if (
    ["resolved", "rejected"].includes(
      normalizeComplaintValue(complaintData.status),
    )
  ) {
    return {
      success: false,
      message:
        "This complaint is already closed and its mediation can no longer be modified.",
    };
  }

  const latestResult = await getLatestMediationSession(complaintId);

  if (!latestResult.success) {
    return latestResult;
  }

  const latestSession = latestResult.data;

  if (!latestSession) {
    return {
      success: false,
      message:
        "No mediation history found. Create a scheduled mediation session first.",
    };
  }

  const latestStatus = normalizeMediationStatus(latestSession.status);

  if (MEDIATION_FINAL_STATUSES.includes(latestStatus)) {
    return {
      success: false,
      message:
        "This mediation is already closed. Officials cannot modify this mediation or complaint anymore.",
    };
  }

  if (!["scheduled", "rescheduled", "unresolved"].includes(latestStatus)) {
    return {
      success: false,
      message:
        "Only the newest scheduled, rescheduled, or unresolved session can be updated. Start a new scheduled session for other records.",
    };
  }

  const statusNeedsSchedule = ["rescheduled"].includes(normalizedStatus);
  const normalizedSessionStart = normalizeMediationDateInput(sessionStart);
  const normalizedSessionEnd = normalizeMediationDateInput(sessionEnd);
  const targetStart = statusNeedsSchedule
    ? normalizedSessionStart
    : latestSession.session_start;
  const targetEnd = statusNeedsSchedule
    ? normalizedSessionEnd
    : latestSession.session_end;

  if (normalizedStatus === "scheduled") {
    return {
      success: false,
      message:
        "Scheduled status must be created as a new session, not by updating the latest row.",
    };
  }

  if (normalizedStatus === "rejected") {
    const { data, error } = await supabase
      .from("settlement_tbl")
      .update({
        status: normalizedStatus,
      })
      .eq("id", latestSession.id)
      .eq("complaint_id", complaintId)
      .select(
        "id, complaint_id, created_at, session_start, session_end, status",
      )
      .single();

    if (error) {
      console.error("Error updating mediation status:", error);
      return { success: false, message: "Failed to update mediation status" };
    }

    const { error: complaintError } = await supabase
      .from("complaint_tbl")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
        updated_by: accessResult.userId,
      })
      .eq("id", complaintId);

    if (complaintError) {
      console.error(
        "Error updating complaint after mediation rejection:",
        complaintError,
      );
      return {
        success: false,
        message: "Mediation was updated but complaint status update failed",
      };
    }

    return {
      success: true,
      message: "Mediation status updated successfully",
      data: {
        ...data,
        status_label: formatMediationStatusLabel(data.status),
        status_color: getMediationStatusColor(data.status),
      },
      complaint: complaintData,
    };
  }

  if (normalizedStatus === "resolved") {
    const { data, error } = await supabase
      .from("settlement_tbl")
      .update({
        status: normalizedStatus,
      })
      .eq("id", latestSession.id)
      .eq("complaint_id", complaintId)
      .select(
        "id, complaint_id, created_at, session_start, session_end, status",
      )
      .single();

    if (error) {
      console.error("Error updating mediation status:", error);
      return { success: false, message: "Failed to update mediation status" };
    }

    const { error: complaintError } = await supabase
      .from("complaint_tbl")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString(),
        updated_by: accessResult.userId,
      })
      .eq("id", complaintId);

    if (complaintError) {
      console.error(
        "Error updating complaint after mediation resolution:",
        complaintError,
      );
      return {
        success: false,
        message: "Mediation was updated but complaint status update failed",
      };
    }

    return {
      success: true,
      message: "Mediation status updated successfully",
      data: {
        ...data,
        status_label: formatMediationStatusLabel(data.status),
        status_color: getMediationStatusColor(data.status),
      },
      complaint: complaintData,
    };
  }

  if (
    statusNeedsSchedule &&
    (!normalizedSessionStart ||
      !normalizedSessionEnd ||
      !isValidMediationRange(targetStart, targetEnd))
  ) {
    return {
      success: false,
      message: "Please provide a valid mediation schedule",
    };
  }

  if (statusNeedsSchedule) {
    const conflictResult = await getMediationConflictSessions({
      sessionStart: targetStart,
      sessionEnd: targetEnd,
      excludeComplaintId: complaintId,
    });

    if (!conflictResult.success) {
      return conflictResult;
    }

    if (conflictResult.data.length > 0) {
      return {
        success: false,
        message:
          "The selected mediation schedule conflicts with another session",
        conflicts: conflictResult.data,
      };
    }
  }

  const updatePayload = {
    status: normalizedStatus,
  };

  if (statusNeedsSchedule) {
    updatePayload.session_start = targetStart;
    updatePayload.session_end = targetEnd;
  }

  const { data, error } = await supabase
    .from("settlement_tbl")
    .update(updatePayload)
    .eq("id", latestSession.id)
    .eq("complaint_id", complaintId)
    .select("id, complaint_id, created_at, session_start, session_end, status")
    .single();

  if (error) {
    console.error("Error updating mediation status:", error);
    return { success: false, message: "Failed to update mediation status" };
  }

  return {
    success: true,
    message: "Mediation status updated successfully",
    data: {
      ...data,
      status_label: formatMediationStatusLabel(data.status),
      status_color: getMediationStatusColor(data.status),
    },
    complaint: complaintData,
  };
};

export const assignAllUnassignedComplaints = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin, isOfficial } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin && !isOfficial) {
    return {
      success: false,
      message: "Only officials or superadmin can assign complaints",
    };
  }

  return assignAllUnassignedByTable(
    "complaint_tbl",
    "status",
    COMPLAINT_ASSIGNABLE_STATUSES,
  );
};

export const transferComplaintAssignment = async (
  complaintId,
  newOfficialUid,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isSuperAdmin } = await checkUserRole(userData.user.id);

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only superadmin can transfer complaint assignments",
    };
  }

  const { data: complaintData } = await supabase
    .from("complaint_tbl")
    .select("id, assigned_official_id")
    .eq("id", complaintId)
    .maybeSingle();

  if (!complaintData) {
    return { success: false, message: "Complaint not found" };
  }

  if (complaintData.assigned_official_id === newOfficialUid) {
    return {
      success: false,
      message: "Selected official is already assigned to this complaint",
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

  // complaint_tbl.updated_by references barangay_officials.uid, so only official UIDs are valid here.
  const { data: actorOfficial } = await supabase
    .from("barangay_officials")
    .select("uid")
    .eq("uid", userData.user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("complaint_tbl")
    .update({
      assigned_official_id: newOfficialUid,
      updated_at: new Date().toISOString(),
      updated_by: actorOfficial?.uid || null,
    })
    .eq("id", complaintId);

  if (error) {
    console.error("Error transferring complaint assignment:", error);
    return {
      success: false,
      message: "Failed to transfer complaint assignment",
    };
  }

  return {
    success: true,
    message: "Complaint assignment transferred successfully",
    assignedOfficialName: `${officialData.first_name} ${officialData.last_name}`,
  };
};
