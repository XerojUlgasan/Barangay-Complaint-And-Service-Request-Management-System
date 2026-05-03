import supabase from "../supabase_client";
import {
  philippineDateTimeLocalToUtcIso,
  toPhilippineDateTimeLocalValue,
} from "../../utils/philippineTime";

export const SETTLEMENT_TYPE_OPTIONS = ["mediation", "conciliation"];
export const SETTLEMENT_STATUS_OPTIONS = [
  "scheduled",
  "rescheduled",
  "unresolved",
  "resolved",
  "rejected",
];

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const toCanonicalSettlementType = (value) => {
  const normalized = normalizeValue(value);
  if (normalized === "concilation") return "conciliation";
  return normalized;
};

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

const ensureOfficial = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { isOfficial } = await checkUserRole(userData.user.id);

  if (!isOfficial) {
    return {
      success: false,
      message: "You do not have permission to access settlements",
    };
  }

  return { success: true, userId: userData.user.id };
};

const ensureAuthenticated = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { success: false, message: "Not authenticated" };
  }

  return { success: true, userId: userData.user.id };
};

const toUtcIso = (value) => {
  const converted = philippineDateTimeLocalToUtcIso(value);
  return converted || null;
};

const getDateKeyFromLocalDateTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes("T")) return "";
  return raw.slice(0, 10);
};

const getDateKeyFromIso = (value) => {
  const local = toPhilippineDateTimeLocalValue(value);
  return local ? local.slice(0, 10) : "";
};

const getTodayDateKeyInManila = () => {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
};

const validateScheduleRules = ({ sessionStart, sessionEnd }) => {
  const startDateKey = getDateKeyFromLocalDateTime(sessionStart);
  const endDateKey = getDateKeyFromLocalDateTime(sessionEnd);
  const todayKey = getTodayDateKeyInManila();

  if (!startDateKey || !endDateKey) {
    return {
      success: false,
      message: "Session start and end are required.",
    };
  }

  if (startDateKey !== endDateKey) {
    return {
      success: false,
      message: "Session start and end must be on the same selected day.",
    };
  }

  if (startDateKey < todayKey) {
    return {
      success: false,
      message: "Past dates are not allowed.",
    };
  }

  return { success: true };
};

const hasValidRange = (startIso, endIso) => {
  if (!startIso || !endIso) return false;

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  // end == start is not allowed, but contiguous across records is allowed.
  return endDate > startDate;
};

const fetchResidentNameMap = async (authUids = []) => {
  const uniqueAuthUids = [...new Set((authUids || []).filter(Boolean))];

  if (uniqueAuthUids.length === 0) {
    return { success: true, data: {} };
  }

  const { data, error } = await supabase
    .from("residents_summary")
    .select("auth_uid, resident_fullname")
    .in("auth_uid", uniqueAuthUids);

  if (error) {
    return { success: false, message: error.message, data: {} };
  }

  const mapped = Object.fromEntries(
    (data || []).map((row) => [
      row.auth_uid,
      row.resident_fullname || "Unknown",
    ]),
  );

  return { success: true, data: mapped };
};

const fetchComplaintMap = async (complaintIds = []) => {
  const uniqueComplaintIds = [...new Set((complaintIds || []).filter(Boolean))];

  if (uniqueComplaintIds.length === 0) {
    return { success: true, data: {} };
  }

  const { data, error } = await supabase
    .from("complaint_tbl")
    .select(
      "id, complaint_type, complainant_id, respondent_id, incident_location, description, incident_date, status, category, created_at",
    )
    .in("id", uniqueComplaintIds);

  if (error) {
    return { success: false, message: error.message, data: {} };
  }

  return {
    success: true,
    data: Object.fromEntries((data || []).map((row) => [String(row.id), row])),
  };
};

export const getSettlementConflicts = async ({
  sessionStart,
  sessionEnd,
  settlementType = null,
  excludeSettlementId = null,
} = {}) => {
  const startIso = toUtcIso(sessionStart);
  const endIso = toUtcIso(sessionEnd);

  if (!hasValidRange(startIso, endIso)) {
    return {
      success: false,
      message: "Invalid schedule. End must be later than start.",
    };
  }

  let query = supabase
    .from("settlement_tbl")
    .select("id, complaint_id, type, status, session_start, session_end")
    .lt("session_start", endIso)
    .gt("session_end", startIso)
    .order("session_start", { ascending: true });

  const normalizedType = settlementType
    ? toCanonicalSettlementType(settlementType)
    : "";
  if (normalizedType) {
    if (!SETTLEMENT_TYPE_OPTIONS.includes(normalizedType)) {
      return {
        success: false,
        message: "Invalid settlement type.",
      };
    }

    query = query.eq("type", normalizedType);
  }

  if (excludeSettlementId) {
    query = query.neq("id", excludeSettlementId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data: data || [] };
};

export const getSettlementComplaintOptions = async () => {
  const accessResult = await ensureOfficial();
  if (!accessResult.success) return accessResult;

  const { data: complaints, error: complaintError } = await supabase
    .from("complaint_tbl")
    .select(
      "id, complaint_type, complainant_id, respondent_id, incident_location, status, created_at, settlement_id",
    )
    .order("created_at", { ascending: false });

  if (complaintError) {
    return { success: false, message: complaintError.message, data: [] };
  }

  const allPartyUids = [
    ...(complaints || []).map((row) => row.complainant_id),
    ...(complaints || []).flatMap((row) =>
      Array.isArray(row.respondent_id) ? row.respondent_id : [],
    ),
  ].filter(Boolean);

  const residentNamesResult = await fetchResidentNameMap(allPartyUids);
  const residentNames = residentNamesResult.success
    ? residentNamesResult.data
    : {};

  const linkedSettlementIds = [
    ...new Set(
      (complaints || []).map((row) => row.settlement_id).filter(Boolean),
    ),
  ];
  let linkedSettlementStatusMap = {};

  if (linkedSettlementIds.length > 0) {
    const { data: linkedSettlements, error: linkedSettlementError } =
      await supabase
        .from("settlement_tbl")
        .select("id, status, type, session_end")
        .in("id", linkedSettlementIds);

    if (linkedSettlementError) {
      return {
        success: false,
        message: linkedSettlementError.message,
        data: [],
      };
    }

    linkedSettlementStatusMap = Object.fromEntries(
      (linkedSettlements || []).map((row) => [String(row.id), row]),
    );
  }

  const nowUtc = new Date();
  const NEW_SESSION_ELIGIBLE_STATUSES = ["unresolved", "rescheduled", "scheduled"];

  const options = (complaints || []).map((row) => {
    const complainantName = residentNames[row.complainant_id] || "Unknown";
    const respondentNames = (
      Array.isArray(row.respondent_id) ? row.respondent_id : []
    )
      .map((uid) => residentNames[uid] || uid)
      .join(", ");

    const linkedSettlement = row.settlement_id
      ? linkedSettlementStatusMap[String(row.settlement_id)] || null
      : null;
    const linkedStatus = normalizeValue(linkedSettlement?.status);
    const hasLinkedSettlement = Boolean(row.settlement_id);

    const sessionEndPassed =
      linkedSettlement?.session_end
        ? new Date(linkedSettlement.session_end) < nowUtc
        : false;

    const isNewSessionEligible =
      hasLinkedSettlement &&
      Boolean(linkedSettlement) &&
      NEW_SESSION_ELIGIBLE_STATUSES.includes(linkedStatus) &&
      sessionEndPassed;

    const isLocked =
      hasLinkedSettlement &&
      Boolean(linkedSettlement) &&
      linkedStatus !== "rejected" &&
      !isNewSessionEligible;

    return {
      id: row.id,
      complaintType: row.complaint_type || "Untitled Complaint",
      incidentLocation: row.incident_location || "Unknown Location",
      status: normalizeValue(row.status) || "for review",
      complainantId: row.complainant_id,
      respondentIds: Array.isArray(row.respondent_id) ? row.respondent_id : [],
      linkedSettlementId: row.settlement_id || null,
      linkedSettlementStatus: linkedStatus || null,
      lockedForNewSettlement: isLocked,
      isNewSessionEligible,
      complainantName,
      respondentNames,
      label: `#${row.id} - ${row.complaint_type || "Untitled Complaint"}${isNewSessionEligible ? " [New Session]" : ""}`,
      subtitle: `Complainant: ${complainantName}${respondentNames ? ` | Respondent(s): ${respondentNames}` : ""}${
        hasLinkedSettlement
          ? ` | Linked settlement #${row.settlement_id}${linkedStatus ? ` (${linkedStatus})` : ""}${
              isNewSessionEligible ? " — eligible for new session" : ""
            }`
          : ""
      }`,
    };
  });

  return { success: true, data: options };
};

const enrichSettlements = async (rows = []) => {
  const complaintIds = rows.map((row) => row.complaint_id);
  const complaintMapResult = await fetchComplaintMap(complaintIds);
  const complaintMap = complaintMapResult.success
    ? complaintMapResult.data
    : {};

  const allPartyUids = rows
    .flatMap((row) => (Array.isArray(row.parties_uid) ? row.parties_uid : []))
    .filter(Boolean);

  const residentNamesResult = await fetchResidentNameMap(allPartyUids);
  const residentNames = residentNamesResult.success
    ? residentNamesResult.data
    : {};

  return rows.map((row) => {
    const complaint = complaintMap[String(row.complaint_id)] || null;
    const partyNames = (
      Array.isArray(row.parties_uid) ? row.parties_uid : []
    ).map((uid) => ({ uid, fullName: residentNames[uid] || uid }));

    return {
      ...row,
      type: toCanonicalSettlementType(row.type),
      sessionStartLocal: toPhilippineDateTimeLocalValue(row.session_start),
      sessionEndLocal: toPhilippineDateTimeLocalValue(row.session_end),
      complaint,
      partyNames,
    };
  });
};

export const getAllSettlements = async ({ type = "all" } = {}) => {
  const accessResult = await ensureOfficial();
  if (!accessResult.success) return accessResult;

  let query = supabase
    .from("settlement_tbl")
    .select("*")
    .order("session_start", { ascending: true })
    .order("id", { ascending: true });

  const normalizedType = toCanonicalSettlementType(type);
  if (normalizedType && normalizedType !== "all") {
    query = query.eq("type", normalizedType);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: error.message, data: [] };
  }

  const enriched = await enrichSettlements(data || []);
  return { success: true, data: enriched };
};

/**
 * Admin-scoped: fetch all settlements (no official role check).
 * Used by the superadmin mediations page.
 */
export const getAllSettlementsForAdmin = async ({ type = "all" } = {}) => {
  const accessResult = await ensureAuthenticated();
  if (!accessResult.success) return accessResult;

  let query = supabase
    .from("settlement_tbl")
    .select("*")
    .order("session_start", { ascending: true })
    .order("id", { ascending: true });

  const normalizedType = toCanonicalSettlementType(type);
  if (normalizedType && normalizedType !== "all") {
    query = query.eq("type", normalizedType);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, message: error.message, data: [] };
  }

  const enriched = await enrichSettlements(data || []);
  return { success: true, data: enriched };
};

/**
 * Fetch ALL settlements for a specific complaint_id.
 * Used for the settlement timeline (history) in the detail view.
 * Ordered by created_at DESC (latest first).
 */
export const getSettlementsByComplaintId = async (complaintId) => {
  const accessResult = await ensureAuthenticated();
  if (!accessResult.success) return accessResult;

  if (!complaintId) {
    return { success: false, message: "Complaint ID is required.", data: [] };
  }

  const { data, error } = await supabase
    .from("settlement_tbl")
    .select("*")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: error.message, data: [] };
  }

  const enriched = await enrichSettlements(data || []);
  return { success: true, data: enriched };
};

/**
 * Fetch complaint info by ID (complaint_id, complaint_type, description).
 * Used by the superadmin mediations detail view.
 */
export const getComplaintById = async (complaintId) => {
  const accessResult = await ensureAuthenticated();
  if (!accessResult.success) return accessResult;

  const { data, error } = await supabase
    .from("complaint_tbl")
    .select("id, complaint_type, description")
    .eq("id", complaintId)
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message, data: null };
  }

  if (!data) {
    return { success: false, message: "Complaint not found.", data: null };
  }

  return { success: true, data };
};

export const getResidentSettlements = async ({ userId = null } = {}) => {
  let targetUserId = userId;

  if (!targetUserId) {
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      return {
        success: false,
        message: authResult.message,
        data: [],
      };
    }

    targetUserId = authResult.userId;
  }

  const { data, error } = await supabase
    .from("settlement_tbl")
    .select("*")
    .contains("parties_uid", [targetUserId])
    .order("session_start", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { success: false, message: error.message, data: [] };
  }

  const enriched = await enrichSettlements(data || []);
  return { success: true, data: enriched };
};

export const createSettlement = async ({
  complaintId,
  type,
  sessionStart,
  sessionEnd,
  status = "scheduled",
} = {}) => {
  const accessResult = await ensureOfficial();
  if (!accessResult.success) return accessResult;

  const scheduleValidation = validateScheduleRules({
    sessionStart,
    sessionEnd,
  });
  if (!scheduleValidation.success) {
    return scheduleValidation;
  }

  const normalizedType = toCanonicalSettlementType(type);
  if (!SETTLEMENT_TYPE_OPTIONS.includes(normalizedType)) {
    return {
      success: false,
      message: "Invalid settlement type.",
    };
  }

  const normalizedStatus = normalizeValue(status);
  if (!SETTLEMENT_STATUS_OPTIONS.includes(normalizedStatus)) {
    return {
      success: false,
      message: "Invalid settlement status.",
    };
  }

  const startIso = toUtcIso(sessionStart);
  const endIso = toUtcIso(sessionEnd);

  if (!hasValidRange(startIso, endIso)) {
    return {
      success: false,
      message: "Invalid schedule. End must be later than start.",
    };
  }

  const conflictsResult = await getSettlementConflicts({
    sessionStart,
    sessionEnd,
    settlementType: normalizedType,
  });

  if (!conflictsResult.success) {
    return conflictsResult;
  }

  if (conflictsResult.data.length > 0) {
    return {
      success: false,
      message: "Schedule conflict detected.",
      conflicts: conflictsResult.data,
    };
  }

  const { data: complaint, error: complaintError } = await supabase
    .from("complaint_tbl")
    .select("id, complainant_id, respondent_id, settlement_id")
    .eq("id", complaintId)
    .maybeSingle();

  if (complaintError || !complaint) {
    return {
      success: false,
      message: complaintError?.message || "Complaint not found.",
    };
  }

  if (complaint.settlement_id) {
    const { data: linkedSettlement, error: linkedSettlementError } =
      await supabase
        .from("settlement_tbl")
        .select("id, status, session_end")
        .eq("id", complaint.settlement_id)
        .maybeSingle();

    if (linkedSettlementError) {
      return {
        success: false,
        message: linkedSettlementError.message,
      };
    }

    const linkedStatus = normalizeValue(linkedSettlement?.status);
    const nowUtc = new Date();
    const sessionEndPassed = linkedSettlement?.session_end
      ? new Date(linkedSettlement.session_end) < nowUtc
      : false;

    const NEW_SESSION_ELIGIBLE_STATUSES = ["unresolved", "rescheduled", "scheduled"];
    const isNewSessionEligible =
      linkedSettlement &&
      NEW_SESSION_ELIGIBLE_STATUSES.includes(linkedStatus) &&
      sessionEndPassed;

    if (!linkedSettlement || (linkedStatus !== "rejected" && !isNewSessionEligible)) {
      return {
        success: false,
        message:
          "This complaint already has a linked settlement. A new one is only allowed when the linked settlement status is rejected, or when the status is unresolved/rescheduled/scheduled and the session end has passed.",
      };
    }

    if (isNewSessionEligible) {
      const { error: updateError } = await supabase
        .from("settlement_tbl")
        .update({ status: "unresolved" })
        .eq("id", linkedSettlement.id);

      if (updateError) {
        return {
          success: false,
          message: `Failed to update previous settlement: ${updateError.message}`,
        };
      }
    }
  }

  const parties = [
    complaint.complainant_id,
    ...(Array.isArray(complaint.respondent_id) ? complaint.respondent_id : []),
  ].filter(Boolean);

  const uniqueParties = [...new Set(parties)];

  if (uniqueParties.length === 0) {
    return {
      success: false,
      message: "No parties found for selected complaint.",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("settlement_tbl")
    .insert({
      complaint_id: complaint.id,
      type: normalizedType,
      status: normalizedStatus,
      session_start: startIso,
      session_end: endIso,
      parties_uid: uniqueParties,
    })
    .select("*")
    .single();

  if (insertError) {
    return { success: false, message: insertError.message };
  }

  const enriched = await enrichSettlements([inserted]);
  return { success: true, data: enriched[0] };
};

export const updateSettlementSchedule = async ({
  settlementId,
  sessionStart,
  sessionEnd,
  status,
} = {}) => {
  const accessResult = await ensureOfficial();
  if (!accessResult.success) return accessResult;

  const scheduleValidation = validateScheduleRules({
    sessionStart,
    sessionEnd,
  });
  if (!scheduleValidation.success) {
    return scheduleValidation;
  }

  const startIso = toUtcIso(sessionStart);
  const endIso = toUtcIso(sessionEnd);

  if (!hasValidRange(startIso, endIso)) {
    return {
      success: false,
      message: "Invalid schedule. End must be later than start.",
    };
  }

  if (
    getDateKeyFromIso(startIso) !== getDateKeyFromIso(endIso) ||
    getDateKeyFromIso(startIso) < getTodayDateKeyInManila()
  ) {
    return {
      success: false,
      message:
        "Session must stay on the same selected day and not be in the past.",
    };
  }

  const normalizedStatus = normalizeValue(status);
  if (!SETTLEMENT_STATUS_OPTIONS.includes(normalizedStatus)) {
    return {
      success: false,
      message: "Invalid settlement status.",
    };
  }

  const { data: existingSettlement, error: existingSettlementError } =
    await supabase
      .from("settlement_tbl")
      .select("id, type")
      .eq("id", settlementId)
      .maybeSingle();

  if (existingSettlementError || !existingSettlement) {
    return {
      success: false,
      message: existingSettlementError?.message || "Settlement not found.",
    };
  }

  const conflictsResult = await getSettlementConflicts({
    sessionStart,
    sessionEnd,
    settlementType: existingSettlement.type,
    excludeSettlementId: settlementId,
  });

  if (!conflictsResult.success) {
    return conflictsResult;
  }

  if (conflictsResult.data.length > 0) {
    return {
      success: false,
      message: "Schedule conflict detected.",
      conflicts: conflictsResult.data,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("settlement_tbl")
    .update({
      session_start: startIso,
      session_end: endIso,
      status: normalizedStatus,
    })
    .eq("id", settlementId)
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      success: false,
      message: updateError?.message || "Settlement not found.",
    };
  }

  const enriched = await enrichSettlements([updated]);
  return { success: true, data: enriched[0] };
};
