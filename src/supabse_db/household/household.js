import supabase from "../supabase_client";
export const getAllHouseholds = async () => {
  const { data, error } = await supabase
    .from("household_tbl")
    .select(`
      *,
      members:sample_household_members_tbl (
        id,
        firstname,
        lastname,
        middlename,
        birthdate,
        age,
        is_activated
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching households:", error);
    return { success: false, message: "Failed to fetch households" };
  }

  return { success: true, data };
};