import supabase from "../supabase_client";
import household_supabase from "../household_supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
} from "../resident/resident";

/**
 * Analytics helper functions for the Barangay Admin Dashboard
 * Provides aggregated data for requests, complaints, officials, and residents
 */

// Get all complaints with detailed information
export const getAllComplaints = async () => {
  try {
    const { data, error } = await supabase
      .from("complaint_tbl")
      .select(
        `
        *,
        official:official_tbl!complaint_tbl_assigned_official_id_fkey (
          firstname,
          lastname,
          role
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching complaints:", error);
      return { success: false, message: error.message, data: [] };
    }

    const complainantAuthUids = [
      ...new Set(data.map((row) => row.complainant_id)),
    ].filter(Boolean);
    const residentsResult = await getResidentsByAuthUids(complainantAuthUids);
    const residentNameMap = residentsResult.success
      ? Object.fromEntries(
          Object.entries(residentsResult.data).map(([authUid, resident]) => [
            authUid,
            formatResidentFullName(resident),
          ]),
        )
      : {};

    // Enrich data with formatted names
    const enriched = data.map((complaint) => ({
      ...complaint,
      complainant_name: residentNameMap[complaint.complainant_id] || "Unknown",
      assigned_official_name:
        complaint.official?.firstname && complaint.official?.lastname
          ? `${complaint.official.firstname} ${complaint.official.lastname}`
          : null,
    }));

    return { success: true, data: enriched };
  } catch (err) {
    console.error("Error in getAllComplaints:", err);
    return { success: false, message: err.message, data: [] };
  }
};

// Get all requests with history data
export const getAllRequests = async () => {
  try {
    const { data, error } = await supabase
      .from("request_tbl")
      .select(
        `
        *,
        official:official_tbl!request_tbl_assigned_official_id_fkey (
          firstname,
          lastname,
          role
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      return { success: false, message: error.message, data: [] };
    }

    const requesterAuthUids = [
      ...new Set(data.map((row) => row.requester_id)),
    ].filter(Boolean);
    const residentsResult = await getResidentsByAuthUids(requesterAuthUids);
    const residentNameMap = residentsResult.success
      ? Object.fromEntries(
          Object.entries(residentsResult.data).map(([authUid, resident]) => [
            authUid,
            formatResidentFullName(resident),
          ]),
        )
      : {};

    // Enrich data
    const enriched = data.map((request) => ({
      ...request,
      status: request.request_status || "pending",
      requester_name: residentNameMap[request.requester_id] || "Unknown",
      assigned_official_name:
        request.official?.firstname && request.official?.lastname
          ? `${request.official.firstname} ${request.official.lastname}`
          : null,
    }));

    return { success: true, data: enriched };
  } catch (err) {
    console.error("Error in getAllRequests:", err);
    return { success: false, message: err.message, data: [] };
  }
};

// Get officials with their workload statistics
export const getOfficialsWithStats = async () => {
  try {
    // First, get all officials
    const { data: officials, error: officialsError } = await supabase
      .from("official_tbl")
      .select("*");

    if (officialsError) {
      console.error("Error fetching officials:", officialsError);
      return { success: false, message: officialsError.message, data: [] };
    }

    // Get request counts per official
    const { data: requestCounts, error: reqError } = await supabase
      .from("request_tbl")
      .select("assigned_official_id, request_status");

    // Get complaint counts per official
    const { data: complaintCounts, error: compError } = await supabase
      .from("complaint_tbl")
      .select("assigned_official_id, status");

    // Process statistics
    const officialsWithStats = officials.map((official) => {
      const requests =
        requestCounts?.filter(
          (r) => r.assigned_official_id === official.auth_uid,
        ) || [];
      const complaints =
        complaintCounts?.filter(
          (c) => c.assigned_official_id === official.auth_uid,
        ) || [];

      const totalCases = requests.length + complaints.length;
      const completedRequests = requests.filter(
        (r) => r.request_status === "completed",
      ).length;
      const completedComplaints = complaints.filter(
        (c) => c.status === "resolved" || c.status === "completed",
      ).length;
      const completedCases = completedRequests + completedComplaints;

      const pendingRequests = requests.filter(
        (r) => r.request_status === "pending",
      ).length;
      const pendingComplaints = complaints.filter(
        (c) => c.status === "pending",
      ).length;
      const pendingCases = pendingRequests + pendingComplaints;

      return {
        ...official,
        full_name: `${official.firstname} ${official.lastname}`,
        stats: {
          totalRequests: requests.length,
          totalComplaints: complaints.length,
          totalCases,
          completedCases,
          pendingCases,
          completionRate:
            totalCases > 0
              ? ((completedCases / totalCases) * 100).toFixed(1)
              : 0,
        },
      };
    });

    return { success: true, data: officialsWithStats };
  } catch (err) {
    console.error("Error in getOfficialsWithStats:", err);
    return { success: false, message: err.message, data: [] };
  }
};

// Get time-based trends for requests (last 6 months)
export const getRequestTrends = async (monthsBack = 6) => {
  try {
    const { data, error } = await supabase
      .from("request_tbl")
      .select("created_at, request_status")
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, message: error.message, data: [] };
    }

    // Group by month
    const now = new Date();
    const monthlyData = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();

      const count = data.filter((req) => {
        const reqDate = new Date(req.created_at);
        return (
          reqDate.getMonth() === date.getMonth() &&
          reqDate.getFullYear() === date.getFullYear()
        );
      }).length;

      monthlyData.push({
        month: monthName,
        year,
        count,
        label: `${monthName} ${year.toString().slice(2)}`,
      });
    }

    return { success: true, data: monthlyData };
  } catch (err) {
    console.error("Error in getRequestTrends:", err);
    return { success: false, message: err.message, data: [] };
  }
};

// Get time-based trends for complaints (last 6 months)
export const getComplaintTrends = async (monthsBack = 6) => {
  try {
    const { data, error } = await supabase
      .from("complaint_tbl")
      .select("created_at, status")
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, message: error.message, data: [] };
    }

    // Group by month
    const now = new Date();
    const monthlyData = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();

      const count = data.filter((comp) => {
        const compDate = new Date(comp.created_at);
        return (
          compDate.getMonth() === date.getMonth() &&
          compDate.getFullYear() === date.getFullYear()
        );
      }).length;

      monthlyData.push({
        month: monthName,
        year,
        count,
        label: `${monthName} ${year.toString().slice(2)}`,
      });
    }

    return { success: true, data: monthlyData };
  } catch (err) {
    console.error("Error in getComplaintTrends:", err);
    return { success: false, message: err.message, data: [] };
  }
};

// Get resident statistics
export const getResidentStats = async () => {
  try {
    const { data: households, error: hError } = await household_supabase
      .from("households")
      .select("id");

    const { data: residents, error: rError } = await household_supabase
      .from("residents")
      .select("id");

    const { data: registrations, error: rrError } = await supabase
      .from("registered_residents")
      .select("is_activated");

    if (hError || rError || rrError) {
      return {
        success: false,
        data: { totalHouseholds: 0, totalResidents: 0, activeResidents: 0 },
      };
    }

    return {
      success: true,
      data: {
        totalHouseholds: households?.length || 0,
        totalResidents: residents?.length || 0,
        activeResidents:
          registrations?.filter((r) => r.is_activated === true).length || 0,
        pendingActivation:
          registrations?.filter((r) => r.is_activated !== true).length || 0,
      },
    };
  } catch (err) {
    console.error("Error in getResidentStats:", err);
    return {
      success: false,
      data: { totalHouseholds: 0, totalResidents: 0, activeResidents: 0 },
    };
  }
};

// Analyze complaints by location (top locations)
export const analyzeComplaintsByLocation = (complaints = []) => {
  const locationCounts = {};

  complaints.forEach((comp) => {
    const location = comp.incident_location || "Unknown";
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  });

  // Convert to array and sort by count
  const sorted = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 locations

  return sorted;
};

// Analyze complaints by type
export const analyzeComplaintsByType = (complaints = []) => {
  const typeCounts = {};

  complaints.forEach((comp) => {
    const type = comp.complaint_type || "Unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
};

// Analyze requests by certificate type
export const analyzeRequestsByType = (requests = []) => {
  const typeCounts = {};

  requests.forEach((req) => {
    const type = req.certificate_type || "Unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
};

// Calculate average response time for requests (time from creation to assignment)
export const calculateAverageResponseTime = (requests = []) => {
  const assignedRequests = requests.filter(
    (r) => r.assigned_official_id && r.created_at && r.updated_at,
  );

  if (assignedRequests.length === 0) return 0;

  const totalHours = assignedRequests.reduce((sum, req) => {
    const created = new Date(req.created_at);
    const updated = new Date(req.updated_at);
    const hours = (updated - created) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return (totalHours / assignedRequests.length).toFixed(1);
};

// Calculate average resolution time for completed requests
export const calculateAverageResolutionTime = (requests = []) => {
  const completedRequests = requests.filter(
    (r) => r.request_status === "completed" && r.created_at && r.updated_at,
  );

  if (completedRequests.length === 0) return 0;

  const totalDays = completedRequests.reduce((sum, req) => {
    const created = new Date(req.created_at);
    const completed = new Date(req.updated_at);
    const days = (completed - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return (totalDays / completedRequests.length).toFixed(1);
};
