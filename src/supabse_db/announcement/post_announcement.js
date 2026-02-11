
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
    console.error("Error inserting data:", error);
  } else {
    console.log("Data inserted successfully");
  }
};
