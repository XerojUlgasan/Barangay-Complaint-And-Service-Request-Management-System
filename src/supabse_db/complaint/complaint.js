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