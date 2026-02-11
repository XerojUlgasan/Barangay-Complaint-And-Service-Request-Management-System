import supabase from "../supabase_client";

var member_id = null;

supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Event: ${event}`);
  console.log(`Event: ${session}`);
});

// REGISTRATION
//1. input household details
export const checkHouseholdMember = async (
  household_id,
  firstname,
  lastname,
  middlename,
  birthdate,
) => {
  const { data, error } = await supabase.rpc("check_household_member", {
    household_id_input: household_id,
    fn_input: firstname,
    ln_input: lastname,
    mn_input: middlename, // PUT NULL IF USER HAS NO MIDDLENAME
    birthdate_input: birthdate, // NOTE THAT IT SHOULD BE SET TO STRING LIKE "YYYY-MM-DD"
  });

  if (error) {
    // ERROR
    console.log(error.message);
    return {
      success: false,
      isExist: false,
    };
  }

  if (data) {
    // HAS DATA
    console.log("DATA FOUND : " + data);
    member_id = data;
    return {
      success: true,
      isExist: true,
    };
  } else if (data == null) {
    // NO DATA
    console.log("NO DATA FOUND");
    return {
      success: true,
      isExist: false,
    };
  }
};

//2. input email and password for registation
export const registerByEmail = async (email, password) => {
  if (!(await checkMemberId())) {
    // CHECKS MEMBER ID
    console.log("MEMBER ID IS " + member_id);
    return {
      success: false,
      message: "Please identify household first.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    console.log(error);
    return {
      success: false,
      message: error.message,
    };
  }

  if (data) {
    console.log(data);
    console.log(await supabase.auth.getUser());
    return {
      success: true,
      message: "OTP is sent to your email",
    };
  }
};
// REGISTRATION

export const loginByEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    if (error.message == "Email not confirmed") {
      console.log(error.message);
      return {
        success: false,
        message: "Email is not confirmed, please confirm it on your email.",
      };
    }
  }

  if (data.user.confirmed_at) {
    console.log(data);
    console.log("LOGGED IN");
  }
};

export const logout = async () => {
  const { data, error } = await supabase.auth.signOut();
};

// FUNCTIONS BELOW IS FOR DEBUG PURPOSES
const checkUser = async () => {
  console.log(await supabase.auth.getUser());
};

const checkMemberId = async () => {
  const { data, error } = await supabase.rpc("check_member_id", {
    member_id_input: member_id,
  });

  if (error) {
    console.log(error.message);
    return false;
  }

  if (data) {
    return true;
  }

  return false;
};
