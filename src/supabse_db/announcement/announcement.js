import supabase from "../supabase_client";
import household_supabase from "../household_supabase_client";

// Cache for announcements with TTL
let announcementCache = { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }; // 5 min cache

const isCacheValid = () => {
  return (
    announcementCache.data &&
    Date.now() - announcementCache.timestamp < announcementCache.ttl
  );
};

// Helper to check if demographic filters are set
const hasAdvancedFilters = (announcement) => {
  return Boolean(
    announcement.purok ||
    announcement.age_group ||
    announcement.voter_status ||
    announcement.occupation ||
    announcement.religion ||
    announcement.civil_status ||
    announcement.sex,
  );
};

// Helper to check if user matches advanced filters
const userMatchesFilters = (userProfile, announcement) => {
  if (!hasAdvancedFilters(announcement)) return true; // No filters = everyone allowed

  const filters = {
    purok: announcement.purok,
    age_group: announcement.age_group,
    voter_status: announcement.voter_status,
    occupation: announcement.occupation,
    religion: announcement.religion,
    civil_status: announcement.civil_status,
    sex: announcement.sex,
  };

  // Check if user matches all applicable filters
  if (filters.purok && !filters.purok.includes(userProfile.purok)) return false;
  if (filters.age_group && !filters.age_group.includes(userProfile.age_group))
    return false;
  if (
    filters.voter_status &&
    !filters.voter_status.includes(userProfile.voter_status)
  )
    return false;
  if (
    filters.occupation &&
    !filters.occupation.includes(userProfile.occupation)
  )
    return false;
  if (filters.religion && !filters.religion.includes(userProfile.religion))
    return false;
  if (
    filters.civil_status &&
    !filters.civil_status.includes(userProfile.civil_status)
  )
    return false;
  if (filters.sex && filters.sex !== userProfile.sex) return false;

  return true;
};

const normalizeSexForDb = (value) => {
  if (value === "M" || value === "Male") return "M";
  if (value === "F" || value === "Female") return "F";
  return null;
};

export const getPurokChoices = async () => {
  const { data, error } = await household_supabase
    .from("puroks")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching purok choices:", error);
    return { success: false, message: error.message, data: [] };
  }

  return {
    success: true,
    data: (data || []).map((row) => row.name).filter(Boolean),
  };
};

export const postAnnouncement = async (
  category,
  priority,
  title,
  content,
  eventData = {},
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  // Log the data being sent for debugging
  const insertPayload = {
    category: category,
    priority: priority,
    title: title,
    content: content,
    event_start: eventData.event_start ?? null,
    event_end: eventData.event_end ?? null,
    audience: eventData.audience ?? null,
    max_participants: eventData.max_participants ?? null,
    purok:
      Array.isArray(eventData.purok) && eventData.purok.length > 0
        ? eventData.purok
        : null,
    age_group:
      Array.isArray(eventData.age_group) && eventData.age_group.length > 0
        ? eventData.age_group
        : null,
    voter_status:
      Array.isArray(eventData.voter_status) && eventData.voter_status.length > 0
        ? eventData.voter_status
        : null,
    occupation:
      Array.isArray(eventData.occupation) && eventData.occupation.length > 0
        ? eventData.occupation
        : null,
    religion:
      Array.isArray(eventData.religion) && eventData.religion.length > 0
        ? eventData.religion
        : null,
    civil_status:
      Array.isArray(eventData.civil_status) && eventData.civil_status.length > 0
        ? eventData.civil_status
        : null,
    sex: normalizeSexForDb(eventData.sex),
    send_sms: eventData.send_sms ?? false,
  };

  console.log("Insert payload:", insertPayload);
  console.log("Occupation array:", insertPayload.occupation);

  const { data, error } = await supabase
    .from("announcement_tbl")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Error inserting announcement:", error);
    console.error("Payload that failed:", insertPayload);
    return { success: false, message: error.message };
  }

  console.log("Announcement inserted successfully");
  invalidateAnnouncementCache();
  return { success: true, data };
};

export const getAnnouncements = async () => {
  // Use cache if valid
  if (isCacheValid()) {
    return { success: true, data: announcementCache.data || [] };
  }

  const { data, error } = await supabase
    .from("announcement_tbl")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    return { success: false, message: error.message };
  }

  // Update cache
  announcementCache = {
    data: data || [],
    timestamp: Date.now(),
    ttl: announcementCache.ttl,
  };

  return { success: true, data: data || [] };
};

// Invalidate cache when announcement is posted/updated/deleted
const invalidateAnnouncementCache = () => {
  announcementCache = { data: null, timestamp: 0, ttl: announcementCache.ttl };
};

export const getAnnouncementById = async (id) => {
  const { data, error } = await supabase
    .from("announcement_tbl")
    .select(
      `
      *,
      announcer_info:superadmin_tbl!announcement_tbl_announcer_fkey (
        auth_uid
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching announcement:", error);
    return { success: false, message: "Failed to fetch announcement" };
  }

  return { success: true, data };
};

export const updateAnnouncement = async (
  id,
  category,
  priority,
  title,
  content,
  eventData = {},
) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const userId = userData.user.id;

  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userId)
    .single();

  if (!superadminData) {
    return {
      success: false,
      message: "Only superadmins can update announcements",
    };
  }

  // Ensure the superadmin requesting the update is the original announcer
  const { data: existingAnn, error: existingAnnError } = await supabase
    .from("announcement_tbl")
    .select("announcer")
    .eq("id", id)
    .single();

  if (existingAnnError || !existingAnn) {
    console.error("Error fetching announcement to update:", existingAnnError);
    return { success: false, message: "Announcement not found" };
  }

  if (existingAnn.announcer !== userId) {
    return {
      success: false,
      message: "Only the announcer superadmin can update this announcement",
    };
  }

  const updatePayload = {
    category,
    priority,
    title,
    content,
  };

  if (Object.prototype.hasOwnProperty.call(eventData, "event_start")) {
    updatePayload.event_start = eventData.event_start;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "event_end")) {
    updatePayload.event_end = eventData.event_end;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "audience")) {
    updatePayload.audience = eventData.audience;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "max_participants")) {
    updatePayload.max_participants = eventData.max_participants;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "purok")) {
    updatePayload.purok =
      Array.isArray(eventData.purok) && eventData.purok.length > 0
        ? eventData.purok
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "age_group")) {
    updatePayload.age_group =
      Array.isArray(eventData.age_group) && eventData.age_group.length > 0
        ? eventData.age_group
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "voter_status")) {
    updatePayload.voter_status =
      Array.isArray(eventData.voter_status) && eventData.voter_status.length > 0
        ? eventData.voter_status
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "occupation")) {
    updatePayload.occupation =
      Array.isArray(eventData.occupation) && eventData.occupation.length > 0
        ? eventData.occupation
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "religion")) {
    updatePayload.religion =
      Array.isArray(eventData.religion) && eventData.religion.length > 0
        ? eventData.religion
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "civil_status")) {
    updatePayload.civil_status =
      Array.isArray(eventData.civil_status) && eventData.civil_status.length > 0
        ? eventData.civil_status
        : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "sex")) {
    updatePayload.sex = normalizeSexForDb(eventData.sex);
  }
  if (Object.prototype.hasOwnProperty.call(eventData, "send_sms")) {
    updatePayload.send_sms = Boolean(eventData.send_sms);
  }

  const { error } = await supabase
    .from("announcement_tbl")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Error updating announcement:", error);
    return { success: false, message: error.message };
  }

  invalidateAnnouncementCache();
  return { success: true, message: "Announcement updated successfully" };
};

export const deleteAnnouncement = async (id) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const userId = userData.user.id;

  const { data: superadminData } = await supabase
    .from("superadmin_tbl")
    .select("id")
    .eq("auth_uid", userId)
    .single();

  if (!superadminData) {
    return {
      success: false,
      message: "Only superadmins can delete announcements",
    };
  }

  // Ensure the superadmin requesting the delete is the original announcer
  const { data: existingAnn, error: existingAnnError } = await supabase
    .from("announcement_tbl")
    .select("announcer")
    .eq("id", id)
    .single();

  if (existingAnnError || !existingAnn) {
    console.error("Error fetching announcement to delete:", existingAnnError);
    return { success: false, message: "Announcement not found" };
  }

  if (existingAnn.announcer !== userId) {
    return {
      success: false,
      message: "Only the announcer superadmin can delete this announcement",
    };
  }

  const { error } = await supabase
    .from("announcement_tbl")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, message: error.message };
  }

  invalidateAnnouncementCache();
  return { success: true, message: "Announcement deleted successfully" };
};

export const signupForEvent = async (announcementId, userProfile = null) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const userId = userData.user.id;

  // fetch the announcement to check audience, max participants, and advanced filters
  const { data: announcement, error: announcementError } = await supabase
    .from("announcement_tbl")
    .select(
      "id, audience, max_participants, purok, age_group, voter_status, occupation, religion, civil_status, sex",
    )
    .eq("id", announcementId)
    .single();

  if (announcementError || !announcement) {
    console.error("Error fetching announcement for signup:", announcementError);
    return { success: false, message: "Announcement not found" };
  }

  const audience = announcement.audience;

  // determine user role: resident or official
  const { data: officialData } = await supabase
    .from("official_tbl")
    .select("id")
    .eq("auth_uid", userId)
    .single();

  const { data: residentData } = await supabase
    .from("registered_residents")
    .select("id")
    .eq("auth_uid", userId)
    .single();

  let userRole = null;
  if (officialData && officialData.id) userRole = "officials";
  else if (residentData && residentData.id) userRole = "residents";

  if (!userRole) {
    return {
      success: false,
      message: "Only registered residents or officials may sign up",
    };
  }

  // audience on announcement should match user role
  if (!audience || audience.toLowerCase() !== userRole) {
    return {
      success: false,
      message: `This event is for '${announcement.audience}' only. Your role: '${userRole}'.`,
    };
  }

  // Check advanced filters if they exist and user is a resident
  if (userRole === "residents" && hasAdvancedFilters(announcement)) {
    if (!userProfile) {
      console.warn(
        "User profile not provided for filter check, allowing signup",
      );
    } else if (!userMatchesFilters(userProfile, announcement)) {
      const missingFilters = [];
      if (
        announcement.purok &&
        !announcement.purok.includes(userProfile.purok)
      ) {
        missingFilters.push(
          `Purok: ${userProfile.purok || "Unknown"} (Required: ${announcement.purok.join(", ")})`,
        );
      }
      if (
        announcement.age_group &&
        !announcement.age_group.includes(userProfile.age_group)
      ) {
        missingFilters.push(
          `Age group: ${userProfile.age_group} (Required: ${announcement.age_group.join(", ")})`,
        );
      }
      if (
        announcement.voter_status &&
        !announcement.voter_status.includes(userProfile.voter_status)
      ) {
        missingFilters.push(
          `Voter status: ${userProfile.voter_status} (Required: ${announcement.voter_status.join(", ")})`,
        );
      }
      if (
        announcement.occupation &&
        !announcement.occupation.includes(userProfile.occupation)
      ) {
        missingFilters.push(
          `Occupation: ${userProfile.occupation} (Required: ${announcement.occupation.join(", ")})`,
        );
      }
      if (
        announcement.religion &&
        !announcement.religion.includes(userProfile.religion)
      ) {
        missingFilters.push(
          `Religion: ${userProfile.religion} (Required: ${announcement.religion.join(", ")})`,
        );
      }
      if (
        announcement.civil_status &&
        !announcement.civil_status.includes(userProfile.civil_status)
      ) {
        missingFilters.push(
          `Civil status: ${userProfile.civil_status} (Required: ${announcement.civil_status.join(", ")})`,
        );
      }
      if (announcement.sex && announcement.sex !== userProfile.sex) {
        missingFilters.push(
          `Sex: ${userProfile.sex} (Required: ${announcement.sex})`,
        );
      }

      return {
        success: false,
        message: `You don't meet the requirements for this event:\n${missingFilters.join("\n")}`,
      };
    }
  }

  // check if user already signed up using a HEAD request to get exact count
  const { count: existingCount, error: existingError } = await supabase
    .from("event_participants")
    .select("*", { count: "exact", head: true })
    .eq("announcement_id", announcementId)
    .eq("user_uid", userId);

  if (existingError) {
    // If we can't verify whether the user already signed up, fail safely.
    console.error("Failed to verify existing signup:", existingError);
    return { success: false, message: "Failed to verify existing signup" };
  }

  if (typeof existingCount === "number" && existingCount > 0) {
    return {
      success: false,
      message: "You have already signed up for this event",
    };
  }

  // check max participants
  if (announcement.max_participants) {
    const { count: participantCount, error: countError } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("announcement_id", announcementId);

    if (countError) {
      console.error("Failed to count participants:", countError);
      return { success: false, message: "Failed to verify participant count" };
    }

    if (
      typeof participantCount === "number" &&
      participantCount >= announcement.max_participants
    ) {
      return { success: false, message: "Event is full" };
    }
  }

  const { data: insertData, error: insertError } = await supabase
    .from("event_participants")
    .insert({ user_uid: userId, announcement_id: announcementId });

  if (insertError) {
    // If DB has a unique constraint, Postgres will return code 23505 for unique_violation.
    const msg = insertError.message || "Failed to sign up";
    const isUniqueViolation =
      insertError.code === "23505" || /unique|duplicate key/i.test(msg);

    if (isUniqueViolation) {
      return {
        success: false,
        message: "You have already signed up for this event",
      };
    }

    console.error("Error signing up for event:", insertError);
    return { success: false, message: msg };
  }

  // Post-insert sanity: ensure there's only one participant row for this user+announcement.
  // If duplicates exist (due to race or partial RLS), keep the earliest and remove extras.
  try {
    const { data: allRows, error: allRowsError } = await supabase
      .from("event_participants")
      .select("user_uid, announcement_id, created_at")
      .eq("announcement_id", announcementId)
      .eq("user_uid", userId)
      .order("created_at", { ascending: true });

    if (allRowsError) {
      console.warn(
        "Could not verify participant rows after insert:",
        allRowsError,
      );
      // Return success because insert succeeded, but warn.
      return { success: true, message: "Signed up successfully" };
    }

    if (Array.isArray(allRows) && allRows.length > 1) {
      // Keep the earliest (first) and delete the rest
      const extras = allRows.slice(1);
      for (const ex of extras) {
        // delete by matching the identifying columns and created_at to avoid removing the kept row
        await supabase.from("event_participants").delete().match({
          announcement_id: announcementId,
          user_uid: userId,
          created_at: ex.created_at,
        });
      }

      return {
        success: false,
        message: "You have already signed up for this event",
      };
    }
  } catch (err) {
    console.warn("Post-insert duplicate cleanup failed:", err);
  }

  // Final participant count sanity-check: if we exceeded max (race), remove this insert and return full.
  if (announcement.max_participants) {
    try {
      const { count: finalCount, error: finalCountError } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcementId);

      if (finalCountError) {
        console.warn(
          "Could not verify final participant count:",
          finalCountError,
        );
      } else if (
        typeof finalCount === "number" &&
        finalCount > announcement.max_participants
      ) {
        // remove the row we just inserted
        const inserted = Array.isArray(insertData) ? insertData[0] : insertData;
        if (inserted && inserted.created_at) {
          await supabase.from("event_participants").delete().match({
            announcement_id: announcementId,
            user_uid: userId,
            created_at: inserted.created_at,
          });
        }

        return { success: false, message: "Event is full" };
      }
    } catch (err) {
      console.warn("Final participant count check failed:", err);
    }
  }

  return { success: true, message: "Signed up successfully" };
};

export const cancelSignup = async (announcementId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const userId = userData.user.id;

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .match({ announcement_id: announcementId, user_uid: userId });

  if (error) {
    console.error("Error cancelling signup:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Signup cancelled successfully" };
};

export const getAnnouncementParticipants = async (announcementId) => {
  // Step 1: fetch all participant rows for this announcement
  const { data: participants, error: pErr } = await supabase
    .from("event_participants")
    .select("id, user_uid, created_at")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: true });

  if (pErr) {
    console.error("Error fetching participants:", pErr);
    return { success: false, message: pErr.message };
  }

  if (!participants || participants.length === 0) {
    return { success: true, data: [] };
  }

  const userUids = participants.map((p) => p.user_uid);

  // Step 2: resolve auth_uid -> registered_residents.id + email
  const { data: regResidents, error: rrErr } = await supabase
    .from("registered_residents")
    .select("id, auth_uid, email")
    .in("auth_uid", userUids);

  if (rrErr) {
    console.error("Error fetching registered residents:", rrErr);
    return { success: false, message: rrErr.message };
  }

  const regMap = new Map((regResidents || []).map((r) => [r.auth_uid, r]));
  const residentIds = (regResidents || []).map((r) => r.id).filter(Boolean);

  // Step 3: fetch full resident details from household_supabase
  let detailMap = new Map();
  if (residentIds.length > 0) {
    const { data: residentDetails, error: rdErr } = await household_supabase
      .from("residents")
      .select(
        "id, first_name, middle_name, last_name, suffix, contact_number, email, address_line",
      )
      .in("id", residentIds);

    if (!rdErr && residentDetails) {
      detailMap = new Map(residentDetails.map((r) => [r.id, r]));
    }
  }

  // Merge into a flat list
  const merged = participants.map((p) => {
    const reg = regMap.get(p.user_uid);
    const detail = reg ? detailMap.get(reg.id) : null;
    const nameParts = detail
      ? [
          detail.first_name,
          detail.middle_name,
          detail.last_name,
          detail.suffix,
        ].filter(Boolean)
      : [];
    const fullName = nameParts.length ? nameParts.join(" ") : "Unknown";
    return {
      participantId: p.id,
      userUid: p.user_uid,
      signedUpAt: p.created_at,
      email: reg?.email || detail?.email || "—",
      fullName,
      contactNumber: detail?.contact_number || "—",
      addressLine: detail?.address_line || "—",
    };
  });

  return { success: true, data: merged };
};

// Export helper functions for filter validation
export { hasAdvancedFilters, userMatchesFilters, invalidateAnnouncementCache };
