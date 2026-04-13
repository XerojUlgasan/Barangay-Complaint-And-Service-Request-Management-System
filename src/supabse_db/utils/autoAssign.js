import supabase from "../supabase_client";

export const UNFINISHED_STATUSES = [
  "pending",
  "in_progress",
  "for_compliance",
  "for_validation",
  "resident_complied",
];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresentActiveOfficials = async () => {
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "official_id, attendance_date, time_in, time_out, official:barangay_officials!fk_official(uid,status)",
    )
    .eq("attendance_date", today)
    .not("time_in", "is", null)
    .is("time_out", null);

  if (error) {
    console.log("getPresentActiveOfficials error:", error);
    return [];
  }

  const availableOfficials = (data || [])
    .map((row) => {
      const relatedOfficial = Array.isArray(row?.official)
        ? row.official[0]
        : row?.official;
      const status = String(relatedOfficial?.status || "").toUpperCase();
      const uid = relatedOfficial?.uid || null;

      if (status !== "ACTIVE" || !uid) return null;

      return {
        officialId: row?.official_id || null,
        uid,
        status,
        attendanceDate: row?.attendance_date || null,
        timeIn: row?.time_in || null,
        timeOut: row?.time_out || null,
      };
    })
    .filter(Boolean);

  const presentActiveUids = [...new Set(availableOfficials.map((o) => o.uid))];

  if (!presentActiveUids.length) {
    console.log(
      "getPresentActiveOfficials: no assignable ACTIVE official uid found for current attendance rows",
      data,
    );
  }

  return {
    uids: presentActiveUids,
    officials: availableOfficials,
  };
};

const pickLeastBusyUid = async (
  tableName,
  statusColumnName,
  unfinishedStatuses = UNFINISHED_STATUSES,
) => {
  const available = await getPresentActiveOfficials();
  const presentUids = available.uids;
  if (!presentUids.length) {
    return null;
  }

  const countsByUid = Object.fromEntries(presentUids.map((uid) => [uid, 0]));

  const { data, error } = await supabase
    .from(tableName)
    .select("assigned_official_id")
    .in("assigned_official_id", presentUids)
    .in(statusColumnName, unfinishedStatuses);

  if (error) {
    console.log(`pickLeastBusyUid error (${tableName}):`, error);
    return null;
  }

  for (const row of data || []) {
    const uid = row?.assigned_official_id;
    if (uid && countsByUid[uid] !== undefined) {
      countsByUid[uid] += 1;
    }
  }

  const entries = Object.entries(countsByUid);
  if (!entries.length) {
    return null;
  }

  const minCount = Math.min(...entries.map(([, count]) => count));
  const tied = entries
    .filter(([, count]) => count === minCount)
    .map(([uid]) => uid);

  const randomIndex = Math.floor(Math.random() * tied.length);
  return tied[randomIndex] || null;
};

const assignSingle = async (
  tableName,
  statusColumnName,
  rowId,
  unfinishedStatuses = UNFINISHED_STATUSES,
) => {
  const selectedUid = await pickLeastBusyUid(
    tableName,
    statusColumnName,
    unfinishedStatuses,
  );

  if (!selectedUid) {
    return { success: false, reason: "no_active_official" };
  }

  const { data, error } = await supabase
    .from(tableName)
    .update({ assigned_official_id: selectedUid })
    .eq("id", rowId)
    .is("assigned_official_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { success: false, reason: "update_failed", message: error.message };
  }

  if (!data?.id) {
    return {
      success: false,
      reason: "no_row_updated",
      message: `No row updated for id ${rowId}. It may already be assigned or blocked by policy.`,
    };
  }

  return { success: true };
};

export const assignAllUnassignedByTable = async (
  tableName,
  statusColumnName,
  unfinishedStatuses = UNFINISHED_STATUSES,
) => {
  const available = await getPresentActiveOfficials();

  const { data, error } = await supabase
    .from(tableName)
    .select("id")
    .is("assigned_official_id", null)
    .in(statusColumnName, unfinishedStatuses)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      success: false,
      message: error.message,
      availableOfficials: available.officials,
    };
  }

  const targetRows = data || [];
  if (!targetRows.length) {
    return {
      success: true,
      assignedCount: 0,
      skippedCount: 0,
      availableOfficials: available.officials,
    };
  }

  let assignedCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const row of targetRows) {
    const result = await assignSingle(
      tableName,
      statusColumnName,
      row.id,
      unfinishedStatuses,
    );

    if (!result.success && result.reason === "no_active_official") {
      return {
        success: false,
        reason: "no_active_official",
        assignedCount,
        skippedCount: skippedCount + (targetRows.length - assignedCount),
        availableOfficials: available.officials,
      };
    }

    if (!result.success) {
      skippedCount += 1;
      failures.push({
        id: row.id,
        reason: result.reason || "unknown",
        message: result.message || "Assignment update failed",
      });
      continue;
    }

    assignedCount += 1;
  }

  return {
    success: true,
    assignedCount,
    skippedCount,
    availableOfficials: available.officials,
    failures,
  };
};
