import supabase from "../supabase_client";

export const getOfficialPerformanceMetrics = async (officialUid, timeFilter = "all") => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, message: "Not authenticated" };
    }

    let dateFilter = null;

    if (timeFilter !== "all") {
      const now = new Date();
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[timeFilter];
      if (days) {
        dateFilter = new Date(now.setDate(now.getDate() - days)).toISOString();
      }
    }

    const allRequestsQuery = supabase.from("request_tbl").select("*");
    const allComplaintsQuery = supabase.from("complaint_tbl").select("*");

    if (dateFilter) {
      allRequestsQuery.gte("created_at", dateFilter);
      allComplaintsQuery.gte("created_at", dateFilter);
    }

    const [{ data: allRequests, error: reqError }, { data: allComplaints, error: compError }] = await Promise.all([
      allRequestsQuery,
      allComplaintsQuery
    ]);

    if (reqError || compError) {
      return { success: false, message: "Failed to fetch performance data" };
    }

    const unclaimedRequests = allRequests.filter(r => !r.assigned_official_id).length;
    const claimedRequests = allRequests.filter(r => r.assigned_official_id).length;
    const unclaimedComplaints = allComplaints.filter(c => !c.assigned_official_id).length;
    const claimedComplaints = allComplaints.filter(c => c.assigned_official_id).length;

    return {
      success: true,
      data: {
        unclaimedRequests,
        claimedRequests,
        unclaimedComplaints,
        claimedComplaints,
        requests: allRequests,
        complaints: allComplaints
      }
    };
  } catch (err) {
    console.error("Error in getOfficialPerformanceMetrics:", err);
    return { success: false, message: err.message };
  }
};

export const getAllOfficialsPerformance = async (timeFilter = "all") => {
  try {
    const { data: officials, error: officialsError } = await supabase
      .from("barangay_officials")
      .select("official_id, uid, first_name, last_name, position, status")
      .eq("status", "ACTIVE")
      .not("uid", "is", null);

    if (officialsError) {
      return { success: false, message: officialsError.message };
    }

    let dateFilter = null;
    if (timeFilter !== "all") {
      const now = new Date();
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[timeFilter];
      if (days) {
        dateFilter = new Date(now.setDate(now.getDate() - days)).toISOString();
      }
    }

    const requestHistoryQuery = supabase.from("request_history_tbl").select("*");
    const complaintHistoryQuery = supabase.from("complaint_history_tbl").select("*");

    if (dateFilter) {
      requestHistoryQuery.gte("updated_at", dateFilter);
      complaintHistoryQuery.gte("updated_at", dateFilter);
    }

    const [{ data: requestHistories }, { data: complaintHistories }] = await Promise.all([
      requestHistoryQuery,
      complaintHistoryQuery
    ]);

    const performanceData = officials.map(official => {
      const requestActions = requestHistories?.filter(h => h.updater_id === official.uid) || [];
      const complaintActions = complaintHistories?.filter(h => h.updater_id === official.uid) || [];

      const totalActions = requestActions.length + complaintActions.length;

      const completedRequestActions = requestActions.filter(h => h.request_status === "completed").length;
      const resolvedComplaintActions = complaintActions.filter(h => h.status === "resolved").length;
      const completedActions = completedRequestActions + resolvedComplaintActions;

      return {
        official_id: official.official_id,
        uid: official.uid,
        name: `${official.first_name} ${official.last_name}`,
        position: official.position,
        totalActions,
        completedActions,
        completionRate: totalActions > 0 ? ((completedActions / totalActions) * 100).toFixed(1) : 0,
        totalRequestActions: requestActions.length,
        completedRequestActions,
        totalComplaintActions: complaintActions.length,
        resolvedComplaintActions
      };
    });

    performanceData.sort((a, b) => b.totalActions - a.totalActions);

    return { success: true, data: performanceData };
  } catch (err) {
    console.error("Error in getAllOfficialsPerformance:", err);
    return { success: false, message: err.message };
  }
};
