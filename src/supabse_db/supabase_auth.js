import supabase from "./supabase_client";

export const signUpEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    console.log(error);
  }
  //   supabase.auth.signInWithPassword();
};

export const signInEmail = async (email, pass) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: pass,
  });

  if (error) {
    console.log(error);
  }

  console.log(data);
};

export const signOutEmail = async () => {
  const { data, error } = await supabase.auth.signOut();

  if (error) {
    console.log(error);
  }

  console.log(data);
};

export const activateAccount = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  console.log(user);
  if (user != null) {
    console.log("has user");
    console.log(user.id);

    const { data, error } = await supabase.from("user_tbl").insert([
      {
        role: "resident",
        firstname: "xeroj",
        lastname: "Ulgasan",
        middlename: "Nilles",
      },
    ]);

    if (error) {
      console.log(error);
    }

    console.log(data);
  } else {
    console.log("no user");
  }
};
