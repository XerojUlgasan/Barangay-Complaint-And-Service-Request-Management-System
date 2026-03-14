import supabase from "../supabase_client";

export const postAnnouncement = async (
  category,
  priority,
  title,
  content,
  eventData = {},
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("announcement_tbl")
    .insert({
      category: category,
      priority: priority,
      title: title,
      content: content,
      event_start: eventData.event_start ?? null,
      event_end: eventData.event_end ?? null,
      participants: eventData.participants ?? null,
      audience: eventData.audience ?? null,
      max_participants: eventData.max_participants ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting announcement:", error);
    return { success: false, message: error.message };
  }

  console.log("Announcement inserted successfully");
  return { success: true, data };
};

export const getAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcement_tbl")
    .select(
      `
      *,
      announcer_info:superadmin_tbl!announcement_tbl_announcer_fkey (
        auth_uid
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    return { success: false, message: "Failed to fetch announcements" };
  }

  console.log("Announcements retrieved:", data);
  return { success: true, data };
};

export const getAnnouncementById = async (id) => {
  const { data, error } = await supabase
    .from("announcement_tbl")
    .select(
      `
      *,
      announcer_info:superadmin_tbl!announcement_tbl_announcer_fkey (
        auth_uid
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching announcement:", error);
    return { success: false, message: "Failed to fetch announcement" };
  }

  return { success: true, data };
};

export const updateAnnouncement = async (
  id,
  category,
  priority,
  title,
  content,
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();

  if (!superadminData) {
    return {
      success: false,
      message: "Only superadmins can update announcements",
    };
  }

  const { error } = await supabase
    .from("announcement_tbl")
    .update({
      category: category,
      priority: priority,
      title: title,
      content: content,
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating announcement:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Announcement updated successfully" };
};

export const deleteAnnouncement = async (id) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userData.user.id)
    .single();

  if (!superadminData) {
    return {
      success: false,
      message: "Only superadmins can delete announcements",
    };
  }

  const { error } = await supabase
    .from("announcement_tbl")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Announcement deleted successfully" };
};
