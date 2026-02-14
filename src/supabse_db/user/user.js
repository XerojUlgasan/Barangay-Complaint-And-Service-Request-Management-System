import supabase from "../supabase_client";

export const insertComplaint = async (type, inci_date, inci_loc, desc) => {
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data?.user;

  if (!user) {
    console.log("No authenticated user found.");
    return false;
  }
  const { data, error } = await supabase
    .from("complaint_tbl")
    .insert({
      complaint_type: type,
      incident_date: inci_date,
      incident_location: inci_loc,
      description: desc,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.log(error);
    return null;
  }

  console.log("Complaint inserted : ", data);
  return data;
};

export const insertRequest = async (subj, desc, cert_type) => {
  const { data, error } = await supabase
    .from("request_tbl")
    .insert({
      subject: subj,
      description: desc,
      certificate_type: cert_type,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.log(error);
    return false;
  }

  console.log("Request INsertedd : ", data);
  return true;
};
