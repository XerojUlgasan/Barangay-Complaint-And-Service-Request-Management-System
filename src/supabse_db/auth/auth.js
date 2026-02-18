import supabase from "../supabase_client";

var member_id = null;

// CHECK USER ROLE (resident, official, super_admin)
export const checkUserRole = async (uid) => {
  const { data, error } = await supabase.rpc("get_user_role", {
    uid: uid,
  });

  if (error) {
    console.error("Error checking user role:", error);
    return null;
  }

  console.log("User role:", data);
  return data;
};

// CHECK HOUSEHOLD MEMBER BEFORE REGISTRATION
export const checkHouseholdMember = async (
  household_id,
  firstname,
  lastname,
  middlename,
  birthdate
) => {
  let query = supabase
    .from("sample_household_members_tbl")
    .select("id,is_activated,auth_uid")
    .eq("firstname", firstname)
    .eq("lastname", lastname)
    .eq("birthdate", birthdate)
    .eq("household_id", household_id);

  if (middlename === null || middlename === "") {
    query = query.is("middlename", null);
  } else {
    query = query.eq("middlename", middlename);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.log(error.message);
    return {
      success: false,
      isExist: false,
    };
  }

  console.log("DATA FOUND : ", data);

  if (data == null) {
    console.log("NO DATA FOUND");
    return {
      success: true,
      isExist: false,
      isActivated: false,
    };
  }

  // SAVE MEMBER ID
  member_id = data.id;

  if (data.is_activated) {
    console.log("MEMBER ALREADY ACTIVATED (EMAIL ALREADY REGISTERED)");
  }

  return {
    success: true,
    isExist: true,
    isActivated: data.is_activated,
  };
};

// REGISTER BY EMAIL
// IMPORTANT: call checkHouseholdMember() first
export const registerByEmail = async (email, password) => {
  console.log("REGISTER ATTEMPT");
  console.log("EMAIL:", email);
  console.log("MEMBER ID:", member_id);

  // 1. Check if member_id is valid
  if (!(await checkMemberId())) {
    console.log("NO MEMBER IDENTIFIED");
    return {
      success: false,
      message: "Please identify household first.",
    };
  }

  // 2. Check if this household member is already activated
  const { data: memberData, error: memberError } = await supabase
    .from("sample_household_members_tbl")
    .select("is_activated")
    .eq("id", member_id)
    .single();

  console.log("MEMBER STATUS:", memberData);

  if (memberError) {
    console.log("MEMBER CHECK ERROR:", memberError.message);
    return {
      success: false,
      message: "Error checking member status.",
    };
  }

  if (memberData.is_activated) {
    console.log("REGISTRATION BLOCKED: MEMBER ALREADY HAS EMAIL");
    return {
      success: false,
      message: "This household member is already registered.",
    };
  }

  // 3. Try to register email in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  console.log("SIGNUP RESPONSE:", data);
  console.log("SIGNUP ERROR:", error);

  if (error) {
    // Email already exists in Auth
    if (
      error.message?.toLowerCase().includes("already registered") ||
      error.code === "user_already_exists"
    ) {
      console.log("EMAIL ALREADY REGISTERED IN AUTH");
      return {
        success: false,
        message: "Email is already registered.",
      };
    }

    return {
      success: false,
      message: error.message,
    };
  }

  console.log("OTP SENT TO EMAIL");
  console.log(await supabase.auth.getUser());

  return {
    success: true,
    message: "OTP is sent to your email",
  };
};

// LOGIN
export const loginByEmail = async (email, password) => {
  console.log("LOGIN ATTEMPT:", email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  console.log(await supabase.auth.getUser());

  if (error) {
    if (error.code == "email_not_confirmed") {
      return {
        success: false,
        message: error.message,
      };
    } else if (error.code == "invalid_credentials") {
      return {
        success: false,
        message: error.message,
      };
    }

    console.log("LOGIN ERROR");
    console.log(error.code);
    console.log(error.message);
  }

  if (data.user?.confirmed_at) {
    console.log(data);
    console.log("LOGGED IN");

    const userRole = await checkUserRole(data.user.id);

    return {
      success: true,
      message: "Logged In Successfully",
      user: data.user,
      role: userRole,
    };
  }

  return {
    success: true,
    message: "Logged In Successfully",
    user: data.user,
    role: null,
  };
};

// LOGOUT
export const logout = async () => {
  console.log("LOGOUT");

  const { data, error } = await supabase.auth.signOut();

  if (error) {
    console.log(error.message);
    return {
      success: false,
      message: error.message,
    };
  }

  console.log("LOGGED OUT");
};

// DEBUG FUNCTIONS

const checkUser = async () => {
  console.log(await supabase.auth.getUser());
};

const checkMemberId = async () => {
  console.log("CHECKING MEMBER ID:", member_id);

  const { data, error } = await supabase.rpc("check_member_id", {
    member_id_input: member_id,
  });

  if (error) {
    console.log(error.message);
    return false;
  }

  console.log("CHECK MEMBER RPC RESULT:", data);

  if (data) {
    return true;
  }

  return false;
};

const bindAuthuidToResident = async () => {
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data?.user;

  if (!user) {
    console.log("No authenticated user found.");
    return false;
  }

  console.log("MEMBER ID : " + member_id);

  const { data, error } = await supabase
    .from("sample_household_members_tbl")
    .update({
      auth_uid: user.id,
      is_activated: true,
    })
    .eq("id", member_id)
    .select("id");

  if (error) {
    console.log(error.message);
    return false;
  }

  console.log("UPDATED HOUSEHOLD MEMBER ID : " + data[0].id);
  return true;
};
