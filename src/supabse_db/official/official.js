import supabase from "../supabase_client";

export const getAssignedComplaints = async () => {
  const { data, error } = await supabase.from("complaint_tbl").select("*") .eq("assigned_official_id", (await supabase.auth.getUser()).data.user.id ); // Replace with actual official ID
  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    console.log(data);
    return;
  }
};

export const getAssignedRequests = async () => {
  const { data, error } = await supabase.from("request_tbl").select("*") .eq("assigned_official_id", (await supabase.auth.getUser()).data.user.id ); // Replace with actual official ID
  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    console.log(data);
    return;
  }
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
      updated_by: userData.user.id,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error updating request:", error);
    return { success: false, message: "Failed to update request" };
  }

  return { success: true, message: "Request updated successfully" };
};

export const updateComplaintStatus = async (complaintId, status, remarks = null, priority_level = null) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();

  if (!officialData) {
    return { success: false, message: "Only officials can update complaint status" };
  }

  const { error } = await supabase
    .from("complaint_tbl")
    .update({
      status: status,
      remarks: remarks,
      priority_level: priority_level,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", complaintId)
    .select("id")
    .single();

  if (error) {
    console.error("Error updating complaint:", error);
    return { success: false, message: "Failed to update complaint" };
  }

  return { success: true, message: "Complaint updated successfully" };
};
