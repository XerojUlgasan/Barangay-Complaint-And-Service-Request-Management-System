import supabase from "../supabase_client";

const residentByAuthUidCache = new Map();
const residentByIdCache = new Map();
const residentLookupPromises = new Map();
const RESIDENT_CACHE_STORAGE_KEY = "barangaylink:resident-cache";
let persistentCacheHydrated = false;

const canUseSessionStorage = () => {
  return typeof window !== "undefined" && !!window.sessionStorage;
};

const writePersistentCache = () => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RESIDENT_CACHE_STORAGE_KEY,
      JSON.stringify({
        byAuthUid: Array.from(residentByAuthUidCache.entries()),
        byId: Array.from(residentByIdCache.entries()),
      }),
    );
  } catch (error) {
    console.error("Failed to persist resident cache:", error);
  }
};

const hydratePersistentCache = () => {
  if (persistentCacheHydrated || !canUseSessionStorage()) {
    return;
  }

  persistentCacheHydrated = true;

  try {
    const rawCache = window.sessionStorage.getItem(RESIDENT_CACHE_STORAGE_KEY);
    if (!rawCache) {
      return;
    }

    const parsedCache = JSON.parse(rawCache);

    (parsedCache?.byAuthUid || []).forEach(([authUid, result]) => {
      if (authUid) {
        residentByAuthUidCache.set(authUid, result);
      }
    });

    (parsedCache?.byId || []).forEach(([residentId, resident]) => {
      if (residentId) {
        residentByIdCache.set(residentId, resident);
      }
    });
  } catch (error) {
    console.error("Failed to hydrate resident cache:", error);
  }
};

const cloneResidentResult = (result) => {
  if (!result) {
    return { success: true, data: null };
  }

  return {
    ...result,
    data: result.data ? { ...result.data } : null,
  };
};

const cacheResidentResult = (authUid, result) => {
  if (authUid) {
    residentByAuthUidCache.set(authUid, cloneResidentResult(result));
  }

  if (result?.success && result.data?.id) {
    residentByIdCache.set(result.data.id, { ...result.data });
  }

  writePersistentCache();
};

const buildResidentResult = (residentData, registrationData) => {
  if (!residentData) {
    return { success: true, data: null };
  }

  const normalizedPurokName =
    residentData.purok_name ||
    residentData.purok?.name ||
    residentData.purok ||
    null;
  const normalizedCivilStatus = residentData.civil_status || "single";

  return {
    success: true,
    data: {
      ...residentData,
      purok_name: normalizedPurokName,
      purok: normalizedPurokName,
      civil_status: normalizedCivilStatus,
      auth_uid: registrationData?.auth_uid || null,
      registered_email: registrationData?.email || null,
      is_activated: registrationData?.is_activated,
    },
  };
};

export const clearResidentCache = () => {
  residentByAuthUidCache.clear();
  residentByIdCache.clear();
  residentLookupPromises.clear();

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(RESIDENT_CACHE_STORAGE_KEY);
  }
};

export const formatResidentFullName = (resident) => {
  if (!resident) return "";

  return [resident.first_name, resident.middle_name, resident.last_name]
    .filter(Boolean)
    .join(" ");
};

export const getResidentByAuthUid = async (authUid, options = {}) => {
  const { forceRefresh = false } = options;

  hydratePersistentCache();

  if (!authUid) {
    return { success: true, data: null };
  }

  if (!forceRefresh) {
    const cachedResult = residentByAuthUidCache.get(authUid);
    if (cachedResult) {
      return cloneResidentResult(cachedResult);
    }

    const pendingLookup = residentLookupPromises.get(authUid);
    if (pendingLookup) {
      return pendingLookup;
    }
  }

  const lookupPromise = (async () => {
    const { data: registrationData, error: registrationError } = await supabase
      .from("registered_residents")
      .select("id, auth_uid, email, is_activated")
      .eq("auth_uid", authUid)
      .maybeSingle();

    if (registrationError) {
      return {
        success: false,
        message: registrationError.message,
        data: null,
      };
    }

    if (!registrationData) {
      return { success: true, data: null };
    }

    const cachedResident = !forceRefresh
      ? residentByIdCache.get(registrationData.id)
      : null;

    if (cachedResident) {
      return buildResidentResult(cachedResident, registrationData);
    }

    const { data: residentData, error: residentError } = await supabase
      .schema("barangaylink")
      .from("residents")
      .select("*, purok:puroks(name)")
      .eq("id", registrationData.id)
      .maybeSingle();

    if (residentError) {
      return { success: false, message: residentError.message, data: null };
    }

    return buildResidentResult(residentData, registrationData);
  })();

  residentLookupPromises.set(authUid, lookupPromise);

  try {
    const result = await lookupPromise;
    if (result.success) {
      cacheResidentResult(authUid, result);
    }
    return cloneResidentResult(result);
  } finally {
    residentLookupPromises.delete(authUid);
  }
};

export const getResidentsByAuthUids = async (authUids = [], options = {}) => {
  const { forceRefresh = false } = options;
  hydratePersistentCache();
  const uniqueAuthUids = [...new Set((authUids || []).filter(Boolean))];

  if (uniqueAuthUids.length === 0) {
    return { success: true, data: {} };
  }

  const mapped = {};
  const missingAuthUids = [];

  uniqueAuthUids.forEach((authUid) => {
    const cachedResult = !forceRefresh
      ? residentByAuthUidCache.get(authUid)
      : null;

    if (cachedResult?.success && cachedResult.data) {
      mapped[authUid] = { ...cachedResult.data };
      return;
    }

    // Retry unresolved/null cached entries so stale misses don't become permanent.
    if (!cachedResult || (cachedResult.success && !cachedResult.data)) {
      missingAuthUids.push(authUid);
    }
  });

  if (missingAuthUids.length === 0) {
    return { success: true, data: mapped };
  }

  const { data: registrations, error: registrationError } = await supabase
    .from("registered_residents")
    .select("id, auth_uid, email, is_activated")
    .in("auth_uid", missingAuthUids);

  if (registrationError) {
    return { success: false, message: registrationError.message, data: {} };
  }

  const residentIds = [...new Set((registrations || []).map((r) => r.id))];

  if (residentIds.length === 0) {
    missingAuthUids.forEach((authUid) => {
      cacheResidentResult(authUid, { success: true, data: null });
    });
    return { success: true, data: mapped };
  }

  const residentsById = {};
  const missingResidentIds = [];

  residentIds.forEach((residentId) => {
    const cachedResident = !forceRefresh
      ? residentByIdCache.get(residentId)
      : null;
    if (cachedResident) {
      residentsById[residentId] = { ...cachedResident };
    } else {
      missingResidentIds.push(residentId);
    }
  });

  if (missingResidentIds.length > 0) {
    const { data: residents, error: residentError } = await supabase
      .schema("barangaylink")
      .from("residents")
      .select("*")
      .in("id", missingResidentIds);

    if (residentError) {
      return { success: false, message: residentError.message, data: {} };
    }

    (residents || []).forEach((resident) => {
      residentsById[resident.id] = resident;
      residentByIdCache.set(resident.id, { ...resident });
    });
  }

  (registrations || []).forEach((registration) => {
    const resident = residentsById[registration.id];
    const result = buildResidentResult(resident, registration);
    cacheResidentResult(registration.auth_uid, result);

    if (result.data) {
      mapped[registration.auth_uid] = { ...result.data };
    }
  });

  return { success: true, data: mapped };
};

export const getResidentsByIds = async (residentIds = [], options = {}) => {
  const { forceRefresh = false } = options;
  hydratePersistentCache();
  const uniqueResidentIds = [...new Set((residentIds || []).filter(Boolean))];

  if (uniqueResidentIds.length === 0) {
    return { success: true, data: {} };
  }

  const mapped = {};
  const missingResidentIds = [];

  uniqueResidentIds.forEach((residentId) => {
    const cachedResident = !forceRefresh
      ? residentByIdCache.get(residentId)
      : null;
    if (cachedResident) {
      mapped[residentId] = { ...cachedResident };
    } else {
      missingResidentIds.push(residentId);
    }
  });

  if (missingResidentIds.length === 0) {
    return { success: true, data: mapped };
  }

  const { data: residents, error: residentError } = await supabase
    .schema("barangaylink")
    .from("residents")
    .select("*, purok:puroks(name)")
    .in("id", missingResidentIds);

  if (residentError) {
    return { success: false, message: residentError.message, data: {} };
  }

  (residents || []).forEach((resident) => {
    const normalizedPurokName =
      resident.purok_name || resident.purok?.name || resident.purok || null;
    const normalizedCivilStatus = resident.civil_status || "single";

    const normalizedResident = {
      ...resident,
      purok_name: normalizedPurokName,
      purok: normalizedPurokName,
      civil_status: normalizedCivilStatus,
    };

    mapped[resident.id] = normalizedResident;
    residentByIdCache.set(resident.id, { ...normalizedResident });
  });

  return { success: true, data: mapped };
};

export const getResidentSummariesByAuthUids = async (
  authUids = [],
  options = {},
) => {
  const { forceRefresh = false } = options;
  hydratePersistentCache();
  const uniqueAuthUids = [...new Set((authUids || []).filter(Boolean))];

  if (uniqueAuthUids.length === 0) {
    return { success: true, data: {} };
  }

  const mapped = {};
  const missingAuthUids = [];

  uniqueAuthUids.forEach((authUid) => {
    const cachedResult = !forceRefresh
      ? residentByAuthUidCache.get(authUid)
      : null;

    if (cachedResult?.success && cachedResult.data) {
      mapped[authUid] = {
        auth_uid: authUid,
        resident_fullname: formatResidentFullName(cachedResult.data),
        resident_id: cachedResult.data.id || null,
      };
      return;
    }

    // Retry unresolved/null cached entries so stale misses don't become permanent.
    if (!cachedResult || (cachedResult.success && !cachedResult.data)) {
      missingAuthUids.push(authUid);
    }
  });

  if (missingAuthUids.length === 0) {
    return { success: true, data: mapped };
  }

  const { data: summaries, error } = await supabase
    .from("residents_summary")
    .select("auth_uid, resident_fullname, id")
    .in("auth_uid", missingAuthUids);

  if (error) {
    return { success: false, message: error.message, data: {} };
  }

  (summaries || []).forEach((summary) => {
    if (!summary?.auth_uid) {
      return;
    }

    mapped[summary.auth_uid] = {
      auth_uid: summary.auth_uid,
      resident_fullname: summary.resident_fullname || "",
      resident_id: summary.id || null,
    };
  });

  return { success: true, data: mapped };
};
