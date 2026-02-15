import supabase from "../supabase_client";

export const getComplaints = async () => {
  const { data, error } = await supabase.from("complaint_tbl").select("*");

  if (error) {
    console.log(error);
    return;
  }

  if (data) {
    console.log(data);
    return;
  }
};
