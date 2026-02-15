import supabase from "../supabase_client";

export const insertComplaint = async (type, inci_date, inci_loc, desc) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }
  
  const { data, error } = await supabase
    .from("complaint_tbl")
    .insert({
      complaint_type: type,
      incident_date: inci_date,
      incident_location: inci_loc,
      description: desc,
      complainant_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Insert complaint error:", error);
    return { success: false, message: error.message };
  }

  console.log("Complaint inserted:", data);
  return { success: true, data };
};

export const insertRequest = async (subj, desc, cert_type) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }
  
  const { data, error } = await supabase
    .from("request_tbl")
    .insert({
      subject: subj,
      description: desc,
      certificate_type: cert_type,
      user_id: user.id,
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

export const getComplaints = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { data: official } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("id", user.id)
    .single();

  const isAdmin = !!official;

  let query = supabase
    .from("complaint_tbl")
    .select(`
      *,
      member:sample_household_members_tbl!complaint_tbl_complainant_id_fkey (
        firstname,
        lastname,
        middlename
      )
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("complainant_id", user.id);
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
      : "Unknown"
  }));

  return { success: true, data: enriched };
};

export const getRequests = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
  }

  const { data: official } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("id", user.id)
    .single();

  const isAdmin = !!official;

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

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requests:", error);
    return { success: false, message: "Failed to fetch requests" };
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

export const getCurrentUserProfile = async () => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("user_tbl")
    .select(`
      *,
      member:sample_household_members_tbl!user_tbl_household_member_id_fkey (
        firstname,
        lastname,
        middlename,
        birthdate,
        age,
        household_id
      )
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return { 
      success: false, 
      message: "Profile not found. Complete registration first."
    };
  }

  return {
    success: true,
    data: {
      ...data,
      member_name: data.member?.firstname && data.member?.lastname
        ? `${data.member.firstname} ${data.member.lastname}`
        : "Unknown"
    }
  };
};