import React, { useCallback, useEffect, useMemo, useState } from "react";
import SettlementCalendar from "./SettlementCalendar";
import {
  createSettlement,
  getAllSettlements,
  getSettlementComplaintOptions,
  updateSettlementSchedule,
} from "../supabse_db/settlement/settlement";
import { usePermissions } from "../context/PermissionsContext";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

export default function OfficialSettlementPage({ title, defaultType }) {
  const { permissions } = usePermissions();
  const [settlements, setSettlements] = useState([]);
  const [complaintOptions, setComplaintOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [settlementResult, complaintsResult] = await Promise.all([
      getAllSettlements(),
      getSettlementComplaintOptions(),
    ]);

    if (!settlementResult.success) {
      setSettlements([]);
      setError(settlementResult.message || "Failed to fetch settlements.");
      setLoading(false);
      return;
    }

    setSettlements(settlementResult.data || []);

    if (!complaintsResult.success) {
      setComplaintOptions([]);
      setError(
        complaintsResult.message || "Failed to fetch complaints for selection.",
      );
      setLoading(false);
      return;
    }

    setComplaintOptions(complaintsResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const defaultTypeCount = useMemo(
    () =>
      settlements.filter(
        (entry) => normalizeValue(entry.type) === normalizeValue(defaultType),
      ).length,
    [defaultType, settlements],
  );

  const handleCreateSettlement = async ({
    complaintId,
    type,
    status,
    sessionStart,
    sessionEnd,
  }) => {
    const result = await createSettlement({
      complaintId: Number(complaintId),
      type,
      status,
      sessionStart,
      sessionEnd,
    });

    if (result.success) {
      await loadData();
    }

    return result;
  };

  const handleUpdateSettlement = async ({
    settlementId,
    sessionStart,
    sessionEnd,
    status,
  }) => {
    const result = await updateSettlementSchedule({
      settlementId,
      sessionStart,
      sessionEnd,
      status,
    });

    if (result.success) {
      await loadData();
    }

    return result;
  };

  return (
    <div className="official-page-shell">
      <div className="recent-tasks-card">
        <div className="card-header">
          <h3>{title}</h3>
        </div>

        <p className="muted" style={{ padding: "0 24px 0.65rem", margin: 0 }}>
          View all settlement schedules, inspect party names from residents, and
          create conflict-free sessions.
        </p>

        <p className="muted" style={{ padding: "0 24px 1rem", margin: 0 }}>
          Showing {settlements.length} total settlement(s), {defaultTypeCount}{" "}
          in this section type.
        </p>

        <div style={{ padding: "0 24px 24px" }}>
          {error ? (
            <p style={{ color: "#dc2626", marginTop: 0 }}>{error}</p>
          ) : null}

          <SettlementCalendar
            settlements={settlements}
            complaintOptions={complaintOptions}
            initialType={defaultType}
            initialFilter={defaultType}
            loading={loading}
            onCreateSettlement={handleCreateSettlement}
            onUpdateSettlement={handleUpdateSettlement}
            permissions={permissions}
          />
        </div>
      </div>
    </div>
  );
}
