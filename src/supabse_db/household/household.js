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
        is_activated,
        auth_uid
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching households:", error);
    return { success: false, message: "Failed to fetch households" };
  }

  return { success: true, data };
};

export const getHouseholdById = async (householdId) => {
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
        is_activated,
        auth_uid
      )
    `)
    .eq("id", householdId)
    .single();

  if (error) {
    console.error("Error fetching household:", error);
    return { success: false, message: "Failed to fetch household" };
  }

  return { success: true, data };
};

export const createHousehold = async () => {
  const { data, error } = await supabase
    .from("household_tbl")
    .insert({})
    .select()
    .single();

  if (error) {
    console.error("Error creating household:", error);
    return { success: false, message: "Failed to create household" };
  }

  return { success: true, data };
};

export const deleteHousehold = async (householdId) => {
  const { error } = await supabase
    .from("household_tbl")
    .delete()
    .eq("id", householdId);

  if (error) {
    console.error("Error deleting household:", error);
    return { success: false, message: "Failed to delete household" };
  }

  return { success: true, message: "Household deleted successfully" };
};

export const getAllHouseholdMembers = async () => {
  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select(`
      *,
      household:household_tbl (
        id
      )
    `)
    .order("lastname", { ascending: true });

  if (error) {
    console.error("Fetch all household members error:", error);
    return { success: false, message: "Failed to load household members" };
  }

  return { success: true, data };
};

export const getHouseholdMembers = async (householdId) => {
  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select(`
      *,
      household:household_tbl (
        id
      )
    `)
    .eq("household_id", householdId)
    .order("lastname", { ascending: true });

  if (error) {
    console.error("Fetch household members error:", error);
    return { success: false, message: "Failed to load household members" };
  }

  return { success: true, data };
};

export const getHouseholdMemberById = async (memberId) => {
  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .select(`
      *,
      household:household_tbl (
        id
      )
    `)
    .eq("id", memberId)
    .single();

  if (error) {
    console.error("Fetch household member error:", error);
    return { success: false, message: "Failed to load household member" };
  }

  return { success: true, data };
};

export const addHouseholdMember = async (memberData) => {
  if (!memberData.firstname || !memberData.lastname || !memberData.household_id) {
    return { success: false, message: "Firstname, lastname, and household ID are required" };
  }

  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .insert({
      firstname: memberData.firstname.trim(),
      lastname: memberData.lastname.trim(),
      middlename: memberData.middlename?.trim() || null,
      birthdate: memberData.birthdate,
      age: memberData.age || null,
      is_activated: memberData.is_activated !== undefined ? memberData.is_activated : true,
      household_id: memberData.household_id,
      auth_uid: memberData.auth_uid || null
    })
    .select()
    .single();

  if (error) {
    console.error("Add household member error:", error);
    return { success: false, message: "Failed to add household member" };
  }

  return { success: true, data };
};

export const updateHouseholdMember = async (memberId, updateData) => {
  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .update({
      firstname: updateData.firstname?.trim(),
      lastname: updateData.lastname?.trim(),
      middlename: updateData.middlename?.trim() || null,
      birthdate: updateData.birthdate,
      age: updateData.age,
      is_activated: updateData.is_activated,
      auth_uid: updateData.auth_uid
    })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    console.error("Update household member error:", error);
    return { success: false, message: "Failed to update household member" };
  }

  return { success: true, data };
};

export const deleteHouseholdMember = async (memberId) => {
  const { error } = await supabase
    .from("sample_household_members_tbl")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Delete household member error:", error);
    return { success: false, message: "Failed to delete household member" };
  }

  return { success: true, message: "Household member deleted successfully" };
};