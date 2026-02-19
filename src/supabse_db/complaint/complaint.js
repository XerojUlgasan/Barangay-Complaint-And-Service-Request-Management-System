import supabase from "../supabase_client";

export const insertComplaint = async (type, inci_date, inci_loc, desc) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }
  
  const { data, error } = await supabase
    .from("complaint_tbl")
    .insert({
      complaint_type: type,
      incident_date: inci_date,
      incident_location: inci_loc,
      description: desc
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

export const getComplaints = async () => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  // Check Superadmin
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isSuperAdmin = !!superadminData;

  // Check Official
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isOfficial = !!officialData;

  let query = supabase
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
    .order("created_at", { ascending: false });

  if (isSuperAdmin) {
    // Superadmin can view all
  } else if (isOfficial) {
    // Officials can view only their assigned complaints
    console.log("Officials not authenticated for full complaint list");
    query = query.eq("assigned_official_id", userData.user.id);
  } else {
    // Residents can view only their own complaints
    query = query.eq("complainant_id", userData.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching complaints:", error);
    return { success: false, message: "Failed to fetch complaints" };
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

export const getComplaintById = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  // Check Superadmin
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isSuperAdmin = !!superadminData;

  // Check Official
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isOfficial = !!officialData;

  let query = supabase
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
    .eq("id", complaintId);

  if (!isSuperAdmin) {
    if (isOfficial) {
      query = query.eq("assigned_official_id", userData.user.id);
    } else {
      query = query.eq("complainant_id", userData.user.id);
    }
  }

  const { data, error } = await query.single();

  if (error || !data) {
    if (isOfficial) {
      return { success: false, message: "Officials not authenticated" };
    }
    console.error("Error fetching complaint:", error);
    return { success: false, message: "Failed to fetch complaint" };
  }

  return { 
    success: true, 
    data: {
      ...data,
      complainant_name: data.member?.firstname && data.member?.lastname
        ? `${data.member.firstname} ${data.member.lastname}`
        : "Unknown",
      assigned_official_name: data.official?.firstname && data.official?.lastname
        ? `${data.official.firstname} ${data.official.lastname}`
        : null
    }
  };
};


export const deleteComplaint = async (complaintId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  // Check Superadmin
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isSuperAdmin = !!superadminData;

  // Check Official
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isOfficial = !!officialData;

  if (isSuperAdmin || isOfficial) {
    return { success: false, message: "Officials and superadmin cant delete complaints" };
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

  // Check Superadmin
  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isSuperAdmin = !!superadminData;

  // Check Official
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();
  const isOfficial = !!officialData;

  let query = supabase
    .from("complaint_history_tbl")
    .select(`
      *,
      updater:official_tbl!complaint_history_tbl_updater_id_fkey (
        firstname,
        lastname,
        role
      ),
      complaint:complaint_tbl!complaint_history_tbl_complaint_id_fkey (
        assigned_official_id,
        complainant_id
      )
    `)
    .eq("complaint_id", complaintId)
    .order("updated_at", { ascending: true });

  if (!isSuperAdmin) {
    if (isOfficial) {
      query = query.eq("complaint.assigned_official_id", userData.user.id);
    } else {
      query = query.eq("complaint.complainant_id", userData.user.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching complaint history:", error);
    return { success: false, message: "Failed to fetch complaint history" };
  }

  const enriched = data.map(history => ({
    ...history,
    updater_name: history.updater?.firstname && history.updater?.lastname
      ? `${history.updater.firstname} ${history.updater.lastname}`
      : "System"
  }));

  return { success: true, data: enriched };
};