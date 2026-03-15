import supabase from "../supabase_client";
import household_supabase from "../household_supabase_client";

export const formatResidentFullName = (resident) => {
  if (!resident) return "";

  return [resident.first_name, resident.middle_name, resident.last_name]
    .filter(Boolean)
    .join(" ");
};

export const getResidentByAuthUid = async (authUid) => {
  const { data: registrationData, error: registrationError } = await supabase
    .from("registered_residents")
    .select("id, auth_uid, email, is_activated")
    .eq("auth_uid", authUid)
    .maybeSingle();

  if (registrationError) {
    return { success: false, message: registrationError.message, data: null };
  }

  if (!registrationData) {
    return { success: true, data: null };
  }

  const { data: residentData, error: residentError } = await household_supabase
    .from("residents")
    .select("*")
    .eq("id", registrationData.id)
    .maybeSingle();

  if (residentError) {
    return { success: false, message: residentError.message, data: null };
  }

  if (!residentData) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: {
      ...residentData,
      auth_uid: registrationData.auth_uid,
      registered_email: registrationData.email,
      is_activated: registrationData.is_activated,
    },
  };
};

export const getResidentsByAuthUids = async (authUids = []) => {
  const uniqueAuthUids = [...new Set((authUids || []).filter(Boolean))];

  if (uniqueAuthUids.length === 0) {
    return { success: true, data: {} };
  }

  const { data: registrations, error: registrationError } = await supabase
    .from("registered_residents")
    .select("id, auth_uid, email, is_activated")
    .in("auth_uid", uniqueAuthUids);

  if (registrationError) {
    return { success: false, message: registrationError.message, data: {} };
  }

  const residentIds = [...new Set((registrations || []).map((r) => r.id))];

  if (residentIds.length === 0) {
    return { success: true, data: {} };
  }

  const { data: residents, error: residentError } = await household_supabase
    .from("residents")
    .select("*")
    .in("id", residentIds);

  if (residentError) {
    return { success: false, message: residentError.message, data: {} };
  }

  const residentsById = {};
  (residents || []).forEach((resident) => {
    residentsById[resident.id] = resident;
  });

  const mapped = {};
  (registrations || []).forEach((registration) => {
    const resident = residentsById[registration.id];
    if (!resident) return;

    mapped[registration.auth_uid] = {
      ...resident,
      auth_uid: registration.auth_uid,
      registered_email: registration.email,
      is_activated: registration.is_activated,
    };
  });

  return { success: true, data: mapped };
};

export const getResidentsByIds = async (residentIds = []) => {
  const uniqueResidentIds = [...new Set((residentIds || []).filter(Boolean))];

  if (uniqueResidentIds.length === 0) {
    return { success: true, data: {} };
  }

  const { data: residents, error: residentError } = await household_supabase
    .from("residents")
    .select("*")
    .in("id", uniqueResidentIds);

  if (residentError) {
    return { success: false, message: residentError.message, data: {} };
  }

  const mapped = {};
  (residents || []).forEach((resident) => {
    mapped[resident.id] = resident;
  });

  return { success: true, data: mapped };
};
