import supabase from "../supabase_client";

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

  const { data, error } = await supabase
    .from("announcement_tbl")
    .insert({
      category: category,
      priority: priority,
      title: title,
      content: content,
      event_start: eventData.event_start ?? null,
      event_end: eventData.event_end ?? null,
      audience: eventData.audience ?? null,
      max_participants: eventData.max_participants ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting announcement:", error);
    return { success: false, message: error.message };
  }

  console.log("Announcement inserted successfully");
  return { success: true, data };
};

export const getAnnouncements = async () => {
  // Determine viewer role (superadmin / official / resident / anonymous)
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData && userData.user ? userData.user.id : null;

  let isSuperadmin = false;
  let isOfficial = false;
  let isResident = false;

  if (userId) {
    const { data: sa } = await supabase
      .from("superadmin_tbl")
      .select("id")
      .eq("auth_uid", userId)
      .single();
    if (sa && sa.id) isSuperadmin = true;

    const { data: off } = await supabase
      .from("official_tbl")
      .select("id")
      .eq("auth_uid", userId)
      .single();
    if (off && off.id) isOfficial = true;

    const { data: res } = await supabase
      .from("sample_household_members_tbl")
      .select("id")
      .eq("auth_uid", userId)
      .single();
    if (res && res.id) isResident = true;
  }

  // Fetch event announcements separately and non-event announcements separately.
  const baseSelect = `
      *,
      announcer_info:superadmin_tbl!announcement_tbl_announcer_fkey (
        auth_uid
      )
    `;

  const [eventsRes, nonEventsRes] = await Promise.all([
    supabase
      .from("announcement_tbl")
      .select(baseSelect)
      .eq("category", "event")
      .order("created_at", { ascending: false }),
    supabase
      .from("announcement_tbl")
      .select(baseSelect)
      .neq("category", "event")
      .order("created_at", { ascending: false }),
  ]);

  if (eventsRes.error) {
    console.error("Error fetching event announcements:", eventsRes.error);
    // continue — there may still be non-event announcements
  }

  if (nonEventsRes.error) {
    console.error(
      "Error fetching non-event announcements:",
      nonEventsRes.error,
    );
    // continue — there may still be event announcements
  }

  const events = eventsRes.data || [];
  const nonEvents = nonEventsRes.data || [];

  // Filter event announcements according to role
  const filteredEvents = events.filter((ann) => {
    const audience = ann.audience ? String(ann.audience).toLowerCase() : null;

    if (!audience) return true; // public event
    if (isSuperadmin) return true;
    if (isOfficial) return audience === "officials";
    // residents and anonymous users
    return audience === "residents";
  });

  // Merge non-event (public) + filtered events, dedupe by id, and sort by created_at desc
  const mergedMap = new Map();
  [...nonEvents, ...filteredEvents].forEach((ann) => {
    mergedMap.set(ann.id, ann);
  });

  const merged = Array.from(mergedMap.values()).sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });

  console.log("Announcements retrieved (merged):", merged);
  return { success: true, data: merged };
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

  const { error } = await supabase
    .from("announcement_tbl")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Error updating announcement:", error);
    return { success: false, message: error.message };
  }

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

  return { success: true, message: "Announcement deleted successfully" };
};

export const signupForEvent = async (announcementId) => {
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData || !userData.user) {
    return { success: false, message: "Not authenticated" };
  }

  const userId = userData.user.id;

  // fetch the announcement to check audience and max participants
  const { data: announcement, error: announcementError } = await supabase
    .from("announcement_tbl")
    .select("id, audience, max_participants")
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
