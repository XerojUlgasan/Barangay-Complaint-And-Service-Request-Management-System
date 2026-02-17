import supabase from "../supabase_client";

export const insertRequest = async (subj, desc, cert_type) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  console.log(userData);
  if (authError || !userData || !userData.user) {
    console.log("No authenticated user found.");
    return { success: false, message: "Not authenticated" };
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

  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("auth_uid")
    .eq("auth_uid", userData.user.id)
    .single();

  const isAdmin = !!officialData;

  let query = supabase
    .from("request_tbl")
    .select(
      `
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
    `,
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("user_id", userData.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requests:", error);
    return { success: false, message: "Failed to fetch requests" };
  }

  const enriched = data.map((request) => ({
    ...request,
    requester_name:
      request.member?.firstname && request.member?.lastname
        ? `${request.member.firstname} ${request.member.lastname}`
        : "Unknown",
    assigned_official_name:
      request.official?.firstname && request.official?.lastname
        ? `${request.official.firstname} ${request.official.lastname}`
        : null,
  }));

  return { success: true, data: enriched };
};

export const getRequestById = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("request_tbl")
    .select(
      `
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
    `,
    )
    .eq("id", requestId)
    .single();

  if (error) {
    console.error("Error fetching request:", error);
    return { success: false, message: "Failed to fetch request" };
  }

  return {
    success: true,
    data: {
      ...data,
      requester_name:
        data.member?.firstname && data.member?.lastname
          ? `${data.member.firstname} ${data.member.lastname}`
          : "Unknown",
      assigned_official_name:
        data.official?.firstname && data.official?.lastname
          ? `${data.official.firstname} ${data.official.lastname}`
          : null,
    },
  };
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

  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("auth_uid")
    .eq("auth_uid", userData.user.id)
    .single();

  if (!officialData) {
    return {
      success: false,
      message: "Only officials can update request status",
    };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      request_status: status,
      remarks: remarks,
      assigned_official_id: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error updating request:", error);
    return { success: false, message: "Failed to update request" };
  }

  return { success: true, message: "Request updated successfully" };
};

export const assignRequestToOfficial = async (requestId, officialId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("id", userData.user.id)
    .single();

  if (!officialData) {
    return { success: false, message: "Only officials can assign requests" };
  }

  const { error } = await supabase
    .from("request_tbl")
    .update({
      assigned_official_id: officialId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error assigning request:", error);
    return { success: false, message: "Failed to assign request" };
  }

  return { success: true, message: "Request assigned successfully" };
};

export const deleteRequest = async (requestId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { error } = await supabase
    .from("request_tbl")
    .delete()
    .eq("id", requestId)
    .eq("user_id", userData.user.id);

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

  const { data, error } = await supabase
    .from("request_history_tbl")
    .select("*")
    .eq("request_id", requestId)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Error fetching request history:", error);
    return { success: false, message: "Failed to fetch request history" };
  }

  const enriched = data.map((history) => ({
    ...history,
    official_name:
      history.official?.firstname && history.official?.lastname
        ? `${history.official.firstname} ${history.official.lastname}`
        : "Unassigned",
  }));

  return { success: true, data: enriched };
};

export const insertRequestHistory = async (
  requestId,
  request_status,
  remarks,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("id", userData.user.id)
    .single();

  const { error } = await supabase.from("request_history_tbl").insert({
    request_id: requestId,
    request_status: request_status,
    remarks: remarks,
    assigned_official_id: officialData ? userData.user.id : null,
  });

  if (error) {
    console.error("Error inserting request history:", error);
    return { success: false, message: "Failed to insert request history" };
  }

  return { success: true, message: "Request history recorded" };
};
