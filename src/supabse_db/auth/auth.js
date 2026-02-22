import supabase from "../supabase_client";

var member_id = null;
var fname = null;
var lname = null;
var mname = null;
var bdate = null;
var house_id = null;

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
  birthdate,
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
  fname = firstname;
  lname = lastname;
  mname = middlename;
  bdate = birthdate;
  house_id = household_id;

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

  const bindSuccess = await bindEmailToResident(email);
  if (!bindSuccess) {
    console.log("WARNING: Failed to bind auth UID to household member");
    return {
      success: false,
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

    const { error } = await supabase.rpc("activate_resident");

    if (error) {
      console.log("failed to activate resident : ", error);
    }

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

const bindEmailToResident = async (email) => {
  // const userResponse = await supabase.auth.getUser();
  // const user = userResponse.data?.user;

  // if (!user) {
  //   console.log("No authenticated user found.");
  //   return false;
  // }

  console.log("MEMBER ID : " + member_id);
  console.log(
    "Binding with - fname:",
    fname,
    "lname:",
    lname,
    "mname:",
    mname,
    "bdate:",
    bdate,
    "house_id:",
    house_id,
    "email:",
    email,
  );

  const { data, error } = await supabase.rpc("bind_email_to_resident_new", {
    p_fname: fname,
    p_lname: lname,
    p_mname: mname || null,
    p_bdate: bdate,
    p_house_id: house_id,
    p_email: email,
  });

  if (error) {
    console.log("RPC ERROR:", error.message);
    console.log("Full error:", error);
    return false;
  }

  console.log(`BINDING SUCCESSFULL TO : ${fname} ${lname}`);
  return true;
};
