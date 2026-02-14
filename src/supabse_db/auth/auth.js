import supabase from "../supabase_client";

var member_id = null;

// supabase.auth.onAuthStateChange((event, session) => {
//   console.log(`Event: ${event}`);
//   console.log(`Event: ${session}`);
// });

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
    // ERROR
    console.log(error.message);
    return {
      success: false,
      isExist: false,
    };
  }

  console.log("DATA FOUND : ", data);

  if (data == null) {
    // NO DATA
    console.log("NO DATA FOUND");
    return {
      success: true,
      isExist: false,
      is_activated: false,
    };
  }

  if (data) {
    // HAS DATA
    member_id = data.id;
    return {
      success: true,
      isExist: true,
      isActivated: data.is_activated, // TRUE MEANS THAT THERE IS ALREADY A EMAIL CONNECTED TO IT!
    };
  }
};

// SHOULD DO checkHouseholdMember() FIRST BEFORE REGISTRATION
export const registerByEmail = async (email, password) => {
  if (!(await checkMemberId())) {
    // IF NOT MEMBER ID
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

// NOTE THAT IF IT RETURNED SUCCESS: FALSE, MEANS REGISTER AGAIN!
export const loginByEmail = async (email, password) => {
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
    console.log("LOGiN ERROR");
    console.log(error.code);
    console.log(error.message);
  }

  if (data.user?.confirmed_at) {
    console.log(data);
    console.log("LOGGED IN");
    await bindAuthuidToResident();
  }

  return {
    success: true,
    message: "Logged In Successfull",
  };
};

// LOG OUT
export const logout = async () => {
  const { data, error } = await supabase.auth.signOut();

  if (error) {
    console.log(error.message);
    return {
      success: false,
      message: error.message,
    };
  }
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
