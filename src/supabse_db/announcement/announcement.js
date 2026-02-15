import supabase from "../supabase_client";

export const postAnnouncement = async (category, priority, title, content) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from('announcement_tbl')
    .insert({
      category: category,
      priority: priority,
      title: title,
      content: content,
      announcer: user.id
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
    .from('announcement_tbl')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    return { success: false, message: "Failed to fetch announcements" };
  }
  
  console.log("Announcements retrieved:", data);
  return { success: true, data };
};