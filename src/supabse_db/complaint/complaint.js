import supabase from "../supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
} from "../resident/resident";
import { assignAllUnassignedByTable } from "../utils/autoAssign";

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

  // First verify user has access to this complaint
  let accessQuery = supabase
    .from("complaint_tbl")
    .select("id, complainant_id")
    .eq("id", complaintId);

  if (!isSuperAdmin && !isOfficial) {
    // Residents can only access their own complaint history
    accessQuery = accessQuery.eq("complainant_id", userData.user.id);
  }

  const { data: accessData } = await accessQuery.maybeSingle();

  if (!accessData) {
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

  return assignAllUnassignedByTable("complaint_tbl", "status");
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
