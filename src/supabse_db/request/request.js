import supabase from "../supabase_client";
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