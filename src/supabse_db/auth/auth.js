import supabase from "../supabase_client";
import household_supabase from "../household_supabase_client";

var member_id = null;
var member_email = null;

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
    .from("residents_tbl_view")
    .select("id,email")
    .eq("first_name", firstname)
    .eq("last_name", lastname)
    .eq("date_of_birth", birthdate)
    .eq("household_id", household_id)
    .eq("status", "Active");

  if (middlename === null || middlename === "") {
    query = query.is("middle_name", null);
  } else {
    query = query.eq("middle_name", middlename);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    member_id = null;
    member_email = null;
    console.log(error.message);
    return {
      success: false,
      isExist: false,
    };
  }

  console.log("DATA FOUND : ", data);

  if (data == null) {
    member_id = null;
    member_email = null;
    console.log("NO DATA FOUND");
    return {
      success: true,
      isExist: false,
      isActivated: false,
    };
  }

  // SAVE MEMBER ID
  member_id = data.id;
  member_email = data.email ? data.email.trim().toLowerCase() : null;

  const { data: registrationData, error: registrationError } = await supabase
    .from("registered_residents")
    .select("id,is_activated,email")
    .eq("id", member_id)
    .maybeSingle();

  if (registrationError) {
    console.log("REGISTERED RESIDENT CHECK ERROR:", registrationError.message);
    return {
      success: false,
      isExist: true,
      isActivated: false,
    };
  }

  const isActivated = registrationData?.is_activated === true;

  if (isActivated) {
    console.log("MEMBER ALREADY ACTIVATED (EMAIL ALREADY REGISTERED)");
  }

  return {
    success: true,
    isExist: true,
    isActivated,
  };
};

// REGISTER BY EMAIL
// IMPORTANT: call checkHouseholdMember() first
export const registerByEmail = async (email, password) => {
  console.log("REGISTER ATTEMPT");
  console.log("EMAIL:", email);
  console.log("MEMBER ID:", member_id);

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check if member_id is valid
  if (!(await checkMemberId())) {
    console.log("NO MEMBER IDENTIFIED");
    return {
      success: false,
      message: "Please identify household first.",
    };
  }

  if (member_email && normalizedEmail !== member_email) {
    return {
      success: false,
      message: "Email does not match barangay resident record.",
    };
  }

  // 2. Check if this resident already has a registered account
  const { data: memberData, error: memberError } = await supabase
    .from("registered_residents")
    .select("id,auth_uid,is_activated,email")
    .eq("id", member_id)
    .maybeSingle();

  console.log("MEMBER STATUS:", memberData);

  if (memberError) {
    console.log("MEMBER CHECK ERROR:", memberError.message);
    return {
      success: false,
      message: "Error checking member status.",
    };
  }

  if (memberData?.is_activated === true) {
    console.log("REGISTRATION BLOCKED: MEMBER ALREADY HAS EMAIL");
    return {
      success: false,
      message: "This household member is already registered.",
    };
  }

  if (memberData?.is_activated === false) {
    if ((memberData.email || "").trim().toLowerCase() !== normalizedEmail) {
      return {
        success: false,
        message: "Email does not match pending registration record.",
      };
    }

    return {
      success: false,
      message:
        "Account already exists but is not activated yet. Please verify your email then sign in.",
    };
  }

  // 3. Try to register email in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
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

  if (!data.user?.id) {
    return {
      success: false,
      message: "Registration failed: no auth user returned.",
    };
  }

  // 4. Map resident profile ID to auth user ID in main database
  const { error: registeredInsertError } = await supabase
    .from("registered_residents")
    .insert({
      id: member_id,
      auth_uid: data.user.id,
      is_activated: false,
      email: normalizedEmail,
    });

  if (registeredInsertError) {
    console.log("REGISTERED_RESIDENTS INSERT ERROR:", registeredInsertError);
    return {
      success: false,
      message: registeredInsertError.message,
    };
  }

  // 5. Update resident email in household database
  const { error: residentUpdateError } = await supabase
    .from("residents_tbl_view")
    .update({ email: normalizedEmail })
    .eq("id", member_id);

  if (residentUpdateError) {
    console.log("RESIDENT EMAIL UPDATE ERROR:", residentUpdateError);
    return {
      success: false,
      message: residentUpdateError.message,
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

    const { error: activationError } = await supabase
      .from("registered_residents")
      .update({ is_activated: true })
      .eq("auth_uid", data.user.id);

    if (activationError) {
      console.log("failed to update resident activation : ", activationError);
    }

    const { error } = await supabase.rpc("activate_resident");

    if (error) {
      console.log("failed to activate resident : ", error);
    }

    const metadataRole = data.user?.app_metadata?.role || null;
    const normalizedRole =
      typeof metadataRole === "string" ? metadataRole.toLowerCase() : null;

    if (normalizedRole === "official" || normalizedRole === "resident") {
      return {
        success: true,
        message: "Logged In Successfully",
        user: data.user,
        role: normalizedRole,
      };
    }

    const { data: superadminData, error: superadminError } = await supabase
      .from("superadmin_tbl")
      .select("id")
      .eq("auth_uid", data.user.id)
      .maybeSingle();

    if (superadminError) {
      console.log("superadmin lookup error:", superadminError);
    }

    if (superadminData?.id) {
      return {
        success: true,
        message: "Logged In Successfully",
        user: data.user,
        role: "super_admin",
      };
    }

    await supabase.auth.signOut();

    return {
      success: false,
      message: "Unauthorized account. Missing role metadata.",
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

// SEND PASSWORD RESET EMAIL
export const requestPasswordReset = async (email) => {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const redirectBase =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:3000";

  if (!normalizedEmail) {
    return {
      success: false,
      message: "Email is required.",
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${redirectBase}/forgot-password`,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Password reset link sent. Please check your email.",
  };
};

// COMPLETE PASSWORD RESET USING RECOVERY TOKENS
export const completePasswordRecovery = async (
  password,
  accessToken,
  refreshToken,
) => {
  const normalizedPassword = (password || "").trim();

  if (!accessToken) {
    return {
      success: false,
      message: "Recovery token is missing from the reset link.",
    };
  }

  if (!refreshToken) {
    return {
      success: false,
      message: "Refresh token is missing from the reset link.",
    };
  }

  if (normalizedPassword.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters.",
    };
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    return {
      success: false,
      message: sessionError.message,
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: normalizedPassword,
  });

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  return {
    success: true,
    message: "Password updated successfully. You can now sign in.",
  };
};

// DEBUG FUNCTIONS

const checkUser = async () => {
  console.log(await supabase.auth.getUser());
};

const checkMemberId = async () => {
  console.log("CHECKING MEMBER ID:", member_id);

  const { data, error } = await supabase
    .from("residents_tbl_view")
    .select("id")
    .eq("id", member_id)
    .maybeSingle();

  if (error) {
    console.log(error.message);
    return false;
  }

  console.log("CHECK MEMBER RPC RESULT:", data);

  return Boolean(data);
};
