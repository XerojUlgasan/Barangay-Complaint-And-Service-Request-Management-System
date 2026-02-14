import supabase from "../supabase_client";

export const postAnnouncement = async (category, priority, title, content) => {
  const { error } = await supabase
    .from('announcement_tbl')
    .insert({
      category: category,
      priority: priority,
      title: title,
      content: content
    });

  if (error) {
    console.error("Error inserting ", error);
  } else {
    console.log("Data inserted successfully");
  }
};

export const getAnnouncements = async () => {
  const { data, error } = await supabase
    .from('announcement_tbl')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    return null;
  }
  
  console.log("Announcements retrieved:", data);
  return data;
};