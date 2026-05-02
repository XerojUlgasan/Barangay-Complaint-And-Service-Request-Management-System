import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import {
  getComplaints,
  getComplaintHistory,
  getComplaintMediationHistory,
  transferComplaintAssignment,
} from "../../supabse_db/complaint/complaint";
import { getActiveOfficialsForAssignment } from "../../supabse_db/official/official";
import {
  getUnassignedComplaints,
  getPresentOfficialsWithDetails,
  bulkAssignComplaints,
} from "../../supabse_db/utils/autoAssign";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "For Review": "#6366f1",
  Recorded: "#0ea5e9",
  Rejected: "#ef4444",
  Resolved: "#06b6d4",
};

const STATUS_TEXT_COLORS = {
  Pending: "#92400e",
  "For Review": "#312e81",
  Recorded: "#0c4a6e",
  Rejected: "#7f1d1d",
  Resolved: "#0f766e",
};

const STATUS_LABELS = {
  pending: "Pending",
  for_review: "For Review",
  recorded: "Recorded",
  rejected: "Rejected",
  resolved: "Resolved",
};

const STATUS_COLOR_MAP = {
  PENDING: "#F59E0B",
  FOR_REVIEW: "#6366F1",
  RECORDED: "#0EA5E9",
  REJECTED: "#EF4444",
  RESOLVED: "#06B6D4",
};

const COMPLAINT_CATEGORIES = {
  community_concern: "Community Concern",
  barangay_complaint: "Barangay Complaint",
  community_dispute: "Community Dispute",
  personal_complaint: "Personal Complaint",
};

const COMPLAINT_CATEGORY_COLORS = {
  community_concern: "#10b981",
  barangay_complaint: "#0ea5e9",
  community_dispute: "#ef4444",
  personal_complaint: "#8b5cf6",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  if (typeof status !== "string") return "Pending";

  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  return (
    STATUS_LABELS[normalized] ||
    normalized
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";
const getStatusTextColor = (statusLabel) =>
  STATUS_TEXT_COLORS[statusLabel] || "#1f2937";

const normalizeComplaintCategory = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

  return normalized || "uncategorized";
};

const getComplaintCategoryLabel = (category) =>
  COMPLAINT_CATEGORIES[normalizeComplaintCategory(category)] || "Uncategorized";

const getComplaintCategoryColor = (category) =>
  COMPLAINT_CATEGORY_COLORS[normalizeComplaintCategory(category)] || "#94a3b8";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const titleCaseTimeline = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const TIMELINE_TYPE_CONFIG = {
  mediation: { color: "#7c3aed", bg: "#ede9fe" },
  conciliation: { color: "#0891b2", bg: "#cffafe" },
};

const TIMELINE_STATUS_CONFIG = {
  scheduled: { color: "#2563eb", bg: "#dbeafe" },
  rescheduled: { color: "#d97706", bg: "#fef3c7" },
  resolved: { color: "#059669", bg: "#d1fae5" },
  unresolved: { color: "#dc2626", bg: "#fee2e2" },
  rejected: { color: "#6b7280", bg: "#f3f4f6" },
};

const getTimelineStatusStyle = (status) => {
  const norm = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  return TIMELINE_STATUS_CONFIG[norm] || TIMELINE_STATUS_CONFIG.scheduled;
};

const getTimelineTypeStyle = (type) => {
  const norm = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  return TIMELINE_TYPE_CONFIG[norm] || TIMELINE_TYPE_CONFIG.mediation;
};

const formatPhilTimeOnlyExt = (isoValue, fallback = "N/A") => {
  if (!isoValue) return fallback;
  const date = new Date(isoValue);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatPhilDateTimeExt = (val, fb = "N/A") => {
  if (!val) return fb;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fb;
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function AdminComplaints() {
  const location = useLocation();
  const [selectedComplaintStatus, setSelectedComplaintStatus] =
    useState("All Status");
  const [selectedComplaintCategory, setSelectedComplaintCategory] =
    useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaintDropdownOpen, setComplaintDropdownOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mediationHistory, setMediationHistory] = useState([]);
  const [mediationHistoryLoading, setMediationHistoryLoading] = useState(false);

  const [assignPopup, setAssignPopup] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [activeOfficials, setActiveOfficials] = useState([]);
  const [officialSearch, setOfficialSearch] = useState("");
  const [showOfficialOptions, setShowOfficialOptions] = useState(false);
  const [selectedOfficialUid, setSelectedOfficialUid] = useState("");
  const [loadingOfficials, setLoadingOfficials] = useState(false);
  const [transferringAssignment, setTransferringAssignment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Auto-assign feature states
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [autoAssignStep, setAutoAssignStep] = useState("filters"); // 'filters', 'officials', 'confirm', 'executing'
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState(null);

  // Unassigned complaints and their filters
  const [unassignedComplaints, setUnassignedComplaints] = useState([]);
  const [availableComplaintTypes, setAvailableComplaintTypes] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedComplaintTypes, setSelectedComplaintTypes] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // Available officials for assignment
  const [presentOfficials, setPresentOfficials] = useState([]);
  const [selectedOfficials, setSelectedOfficials] = useState({});

  // Confirmation and results
  const [filteredUnassignedComplaints, setFilteredUnassignedComplaints] =
    useState([]);
  const [assignmentDistribution, setAssignmentDistribution] = useState([]);
  const [autoAssignResult, setAutoAssignResult] = useState(null);

  const searchTerms = Array.from(
    new Set(searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)),
  );

  const highlightText = (value) => {
    const text = String(value ?? "");
    if (!searchTerms.length || !text) return text;

    const pattern = new RegExp(
      `(${searchTerms.map((term) => escapeRegExp(term)).join("|")})`,
      "gi",
    );

    return text.split(pattern).map((part, index) => {
      const isMatch = searchTerms.includes(part.toLowerCase());
      if (!isMatch) return part;
      return (
        <mark
          key={`${part}-${index}`}
          style={{
            backgroundColor: "#fde68a",
            color: "#1f2937",
            padding: "0 2px",
            borderRadius: "2px",
          }}
        >
          {part}
        </mark>
      );
    });
  };

  // Auto-open modal if navigated with selectedItemId
  useEffect(() => {
    if (location.state?.selectedItemId && complaints.length > 0) {
      const item = complaints.find(
        (c) => c.id === location.state.selectedItemId,
      );
      if (item) {
        openModal(item);
      }
    }
  }, [location.state, complaints]);

  const transformComplaintData = (dbComplaint) => {
    return {
      id: dbComplaint.id,
      title: dbComplaint.complaint_type || "Untitled Complaint",
      location: dbComplaint.incident_location || "Unknown Location",
      status: normalizeStatus(dbComplaint.status),
      category: normalizeComplaintCategory(dbComplaint.category),
      mediationAccepted: Boolean(dbComplaint.mediation_accepted),
      complainant: dbComplaint.complainant_name || "Unknown",
      assignedOfficial: dbComplaint.assigned_official_name || "",
      date: dbComplaint.created_at
        ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbComplaint.updated_at
        ? new Date(dbComplaint.updated_at).toISOString().split("T")[0]
        : dbComplaint.created_at
          ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficialUid: dbComplaint.assigned_official_id || "",
      priority: dbComplaint.priority_level || "Normal",
      description: dbComplaint.description || "No description provided",
      remarks: dbComplaint.remarks || "No remarks yet",
    };
  };

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setErrorComplaints(null);
      console.log("AdminComplaints: Starting fetch...");
      const result = await getComplaints();
      console.log("AdminComplaints: getComplaints result:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("AdminComplaints: Raw data from DB:", result.data);
        const transformedComplaints = result.data.map((complaint) =>
          transformComplaintData(complaint),
        );
        console.log(
          "AdminComplaints: Transformed data:",
          transformedComplaints,
        );
        setComplaints(transformedComplaints);
      } else {
        console.error(
          "AdminComplaints: Failed to fetch complaints:",
          result.message,
        );
        setErrorComplaints(result.message || "Failed to fetch complaints");
        setComplaints([]);
      }
    } catch (err) {
      console.error("AdminComplaints: Catch error:", err);
      setErrorComplaints("Error fetching complaints: " + err.message);
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Filter complaints based on status, search query, and date range
  const filteredComplaints = complaints.filter((complaint) => {
    // Status filter
    const statusMatch =
      selectedComplaintStatus === "All Status" ||
      complaint.status === selectedComplaintStatus;

    const categoryMatch =
      selectedComplaintCategory === "all" ||
      complaint.category === selectedComplaintCategory;

    // Search filter
    const searchableColumns = [
      complaint.id,
      complaint.title,
      complaint.location,
      getComplaintCategoryLabel(complaint.category),
      complaint.status,
      complaint.mediationAccepted ? "Accepted" : "No",
      complaint.complainant,
      complaint.assignedOfficial || "Unassigned",
      complaint.date,
      complaint.lastUpdate,
      complaint.description,
      complaint.remarks,
    ]
      .join(" ")
      .toLowerCase();

    const searchMatch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableColumns.includes(term));

    // Date filter
    const complaintDate = new Date(complaint.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch =
      (!start || complaintDate >= start) && (!end || complaintDate <= end);

    return statusMatch && categoryMatch && searchMatch && dateMatch;
  });

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const openModal = (complaint) => {
    setSelectedComplaint(complaint);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setIsModalOpen(true);
    fetchHistory(complaint.id);
    fetchMediationHistory(complaint.id);
    fetchActiveOfficials();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setMediationHistory([]);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  const fetchActiveOfficials = async () => {
    setLoadingOfficials(true);
    try {
      const result = await getActiveOfficialsForAssignment();
      if (result.success && Array.isArray(result.data)) {
        setActiveOfficials(result.data);
      } else {
        setActiveOfficials([]);
        if (result.message) {
          setAssignPopup({
            open: true,
            title: "Unable to Load Officials",
            message: result.message,
          });
        }
      }
    } catch (err) {
      setActiveOfficials([]);
      setAssignPopup({
        open: true,
        title: "Unable to Load Officials",
        message: err.message || "Failed to load active officials",
      });
    } finally {
      setLoadingOfficials(false);
    }
  };

  const fetchHistory = async (complaintId) => {
    if (!complaintId) return;
    setHistoryLoading(true);
    try {
      const result = await getComplaintHistory(complaintId);
      if (result.success) {
        setHistory(result.data || []);
      } else {
        console.error("AdminComplaints: history fetch failed", result.message);
        setHistory([]);
      }
    } catch (err) {
      console.error("AdminComplaints: error fetching history", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const fetchMediationHistory = async (complaintId) => {
    if (!complaintId) return;
    setMediationHistoryLoading(true);
    try {
      const result = await getComplaintMediationHistory(complaintId);
      if (result.success) {
        setMediationHistory(result.data || []);
      } else {
        console.error(
          "AdminComplaints: mediation history fetch failed",
          result.message,
        );
        setMediationHistory([]);
      }
    } catch (err) {
      console.error("AdminComplaints: error fetching mediation history", err);
      setMediationHistory([]);
    }
    setMediationHistoryLoading(false);
  };

  const filteredOfficials = activeOfficials.filter((official) => {
    if (official.uid === selectedComplaint?.assignedOfficialUid) {
      return false;
    }

    const fullName = `${official.first_name || ""} ${official.last_name || ""}`
      .trim()
      .toLowerCase();
    const position = (official.position || "").toLowerCase();
    const query = officialSearch.trim().toLowerCase();

    if (!query) return true;
    return fullName.includes(query) || position.includes(query);
  });

  const getOfficialLabel = (official) =>
    `${`${official.first_name || ""} ${official.last_name || ""}`.trim()} - ${official.position || "Officer"}`;

  const handlePickOfficial = (official) => {
    setOfficialSearch(getOfficialLabel(official));
    setSelectedOfficialUid(official.uid);
    setShowOfficialOptions(false);
  };

  const handleTransferComplaint = async () => {
    if (
      !selectedComplaint?.id ||
      !selectedOfficialUid ||
      transferringAssignment
    ) {
      return;
    }

    setTransferringAssignment(true);

    try {
      const result = await transferComplaintAssignment(
        selectedComplaint.id,
        selectedOfficialUid,
      );

      if (!result.success) {
        setAssignPopup({
          open: true,
          title: "Transfer Failed",
          message: result.message || "Unable to transfer complaint assignment.",
        });
        return;
      }

      const assignedOfficialName = result.assignedOfficialName || "Assigned";

      setSelectedComplaint((prev) =>
        prev
          ? {
              ...prev,
              assignedOfficialUid: selectedOfficialUid,
              assignedOfficial: assignedOfficialName,
              lastUpdate: new Date().toISOString().split("T")[0],
            }
          : prev,
      );

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === selectedComplaint.id
            ? {
                ...complaint,
                assignedOfficialUid: selectedOfficialUid,
                assignedOfficial: assignedOfficialName,
                lastUpdate: new Date().toISOString().split("T")[0],
              }
            : complaint,
        ),
      );

      await fetchHistory(selectedComplaint.id);

      setAssignPopup({
        open: true,
        title: "Assignment Transferred",
        message: `Complaint #${selectedComplaint.id} is now assigned to ${assignedOfficialName}.`,
      });
    } finally {
      setTransferringAssignment(false);
    }
  };

  // ============== AUTO-ASSIGN FUNCTIONS ==============

  const openAutoAssignModal = async () => {
    setAutoAssignModalOpen(true);
    setAutoAssignStep("filters");
    setAutoAssignError(null);
    setAutoAssignLoading(true);

    try {
      // Fetch unassigned complaints
      const compResult = await getUnassignedComplaints();
      if (!compResult.success || compResult.data.length === 0) {
        setAutoAssignError(
          compResult.message || "No unassigned complaints found",
        );
        setAutoAssignLoading(false);
        return;
      }

      setUnassignedComplaints(compResult.data);

      // Extract unique complaint types and statuses (excluding "recorded")
      const complaintTypes = [
        ...new Set(compResult.data.map((c) => c.complaint_type)),
      ];
      const statuses = [
        ...new Set(
          compResult.data
            .map((c) => normalizeStatus(c.status))
            .filter((s) => s !== "Recorded"), // Exclude "recorded" status
        ),
      ];

      setAvailableComplaintTypes(complaintTypes);
      setAvailableStatuses(statuses);

      // Initialize all as unchecked
      const complaintTypeObj = {};
      complaintTypes.forEach((ct) => {
        complaintTypeObj[ct] = false;
      });
      setSelectedComplaintTypes(complaintTypeObj);

      const statusObj = {};
      statuses.forEach((s) => {
        statusObj[s] = false;
      });
      setSelectedStatuses(statusObj);

      // Fetch present officials
      const officialResult = await getPresentOfficialsWithDetails();
      if (!officialResult.success) {
        setAutoAssignError(
          officialResult.message || "No officials present today",
        );
        setAutoAssignLoading(false);
        return;
      }

      setPresentOfficials(officialResult.data);

      // Initialize all officials as unchecked
      const officialObj = {};
      officialResult.data.forEach((o) => {
        officialObj[o.uid] = false;
      });
      setSelectedOfficials(officialObj);

      setAutoAssignLoading(false);
    } catch (err) {
      setAutoAssignError("Error loading data: " + err.message);
      setAutoAssignLoading(false);
    }
  };

  const closeAutoAssignModal = () => {
    setAutoAssignModalOpen(false);
    setAutoAssignStep("filters");
    setAutoAssignError(null);
    setAutoAssignLoading(false);
    setUnassignedComplaints([]);
    setAvailableComplaintTypes([]);
    setAvailableStatuses([]);
    setSelectedComplaintTypes({});
    setSelectedStatuses({});
    setPresentOfficials([]);
    setSelectedOfficials({});
    setFilteredUnassignedComplaints([]);
    setAssignmentDistribution([]);
    setAutoAssignResult(null);
  };

  const handleProceedToOfficials = () => {
    const selectedTypeCount = Object.values(selectedComplaintTypes).filter(
      Boolean,
    ).length;
    const selectedStatusCount =
      Object.values(selectedStatuses).filter(Boolean).length;

    if (selectedTypeCount === 0 || selectedStatusCount === 0) {
      setAutoAssignError(
        "Please select at least one complaint type and status",
      );
      return;
    }

    // Filter unassigned complaints based on selections
    const filtered = unassignedComplaints.filter((comp) => {
      const typeMatch = selectedComplaintTypes[comp.complaint_type];
      const statusMatch = selectedStatuses[normalizeStatus(comp.status)];
      return typeMatch && statusMatch;
    });

    if (filtered.length === 0) {
      setAutoAssignError("No complaints match the selected filters");
      return;
    }

    setFilteredUnassignedComplaints(filtered);
    setAutoAssignStep("officials");
    setAutoAssignError(null);
  };

  // Calculate currently filtered complaints for preview
  const getFilteredComplaintsPreview = () => {
    const selectedTypeCount = Object.values(selectedComplaintTypes).filter(
      Boolean,
    ).length;
    const selectedStatusCount =
      Object.values(selectedStatuses).filter(Boolean).length;

    if (selectedTypeCount === 0 || selectedStatusCount === 0) {
      return unassignedComplaints;
    }

    return unassignedComplaints.filter((comp) => {
      const typeMatch = selectedComplaintTypes[comp.complaint_type];
      const statusMatch = selectedStatuses[normalizeStatus(comp.status)];
      return typeMatch && statusMatch;
    });
  };

  // Cluster complaint types (others at bottom)
  const getClusteredComplaintTypes = () => {
    const others = availableComplaintTypes.filter((ct) =>
      String(ct).toLowerCase().startsWith("other"),
    );
    const regular = availableComplaintTypes.filter(
      (ct) => !String(ct).toLowerCase().startsWith("other"),
    );
    return [...regular, ...others];
  };

  const handleProceedToConfirm = () => {
    const selectedOfficialUids = Object.entries(selectedOfficials)
      .filter(([, checked]) => checked)
      .map(([uid]) => uid);

    if (selectedOfficialUids.length === 0) {
      setAutoAssignError("Please select at least one official");
      return;
    }

    // Calculate distribution
    const itemCount = filteredUnassignedComplaints.length;
    const officialCount = selectedOfficialUids.length;
    const baseCount = Math.floor(itemCount / officialCount);
    const remainder = itemCount % officialCount;

    const distribution = selectedOfficialUids.map((uid, idx) => {
      const official = presentOfficials.find((o) => o.uid === uid);
      return {
        uid,
        name: `${official?.firstName || ""} ${official?.lastName || ""}`.trim(),
        position: official?.position || "",
        count: idx === 0 ? baseCount + remainder : baseCount,
      };
    });

    setAssignmentDistribution(distribution);
    setAutoAssignStep("confirm");
    setAutoAssignError(null);
  };

  const handleConfirmAssignment = async () => {
    setAutoAssignStep("executing");
    setAutoAssignLoading(true);
    setAutoAssignError(null); // Clear any previous error

    try {
      const complaintIds = filteredUnassignedComplaints.map((c) => c.id);
      const selectedOfficialUids = Object.entries(selectedOfficials)
        .filter(([, checked]) => checked)
        .map(([uid]) => uid);

      const result = await bulkAssignComplaints(
        complaintIds,
        selectedOfficialUids,
      );

      if (!result.success) {
        setAutoAssignError(
          `Assignment failed: ${result.failureCount} items could not be assigned`,
        );
        setAutoAssignLoading(false);
        setAutoAssignStep("confirm");
        return;
      }

      setAutoAssignResult(result);
      await fetchComplaints(); // Refresh the complaints list
      setAutoAssignLoading(false);
    } catch (err) {
      setAutoAssignError("Error during assignment: " + err.message);
      setAutoAssignLoading(false);
      setAutoAssignStep("confirm");
    }
  };

  const statusOptions = [
    "All Status",
    "Pending",
    "For Review",
    "Recorded",
    "Resolved",
    "Rejected",
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "community_concern", label: "Community Concern" },
    { value: "barangay_complaint", label: "Barangay Complaint" },
    { value: "community_dispute", label: "Community Dispute" },
    { value: "personal_complaint", label: "Personal Complaint" },
  ];

  return (
    <div className="admin-page">
      {/* Blurrable page content wrapper */}
      <div
        className={`ar-page-content${isModalOpen ? " modal-open-blur" : ""}`}
      >
        {/* Page Header */}
        <div
          className="page-actions"
          style={{ alignItems: "flex-start", marginBottom: 12 }}
        >
          <div>
            <h3>System-wide Complaints</h3>
            <p className="muted">Monitor all complaints across the barangay.</p>
          </div>
        </div>

        {/* COMPLAINTS SECTION */}
        <div style={{ marginBottom: "2.5rem" }}>
          {/* Filters and Search */}
          <div
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {/* Search Bar */}
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Search
              </label>
              <input
                type="text"
                placeholder="Search by type, location, complainant, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            {/* Date Range Filters */}
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                  }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={
                    new Date(
                      new Date().getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  style={{
                    padding: "0.625rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                  }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={
                    new Date(
                      new Date().getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  style={{
                    padding: "0.625rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              {(startDate || endDate || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  style={{
                    padding: "0.625rem 1rem",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div style={{ minWidth: "220px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Category
              </label>
              <select
                value={selectedComplaintCategory}
                onChange={(e) => setSelectedComplaintCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  backgroundColor: "#ffffff",
                }}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={openAutoAssignModal}
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                background: "#10b981",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Auto Assign Complaints
            </button>

            <div
              className="status-filter-wrapper"
              style={{ marginBottom: 0, position: "relative" }}
            >
              <button
                className="status-filter-btn"
                onClick={() => setComplaintDropdownOpen(!complaintDropdownOpen)}
              >
                {selectedComplaintStatus}
                <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
              </button>
              {complaintDropdownOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 999 }}
                    onClick={() => setComplaintDropdownOpen(false)}
                  />
                  <div
                    className="status-filter-dropdown"
                    style={{
                      zIndex: 1000,
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.25rem",
                    }}
                  >
                    {statusOptions.map((option) => (
                      <div
                        key={option}
                        className="status-filter-item"
                        onClick={() => {
                          setSelectedComplaintStatus(option);
                          setComplaintDropdownOpen(false);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {errorComplaints && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fee2e2",
                borderRadius: "0.5rem",
                color: "#991b1b",
              }}
            >
              Error: {errorComplaints}
            </div>
          )}

          {loadingComplaints && (
            <div style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="loading-wrap">
                <div className="loading-spinner" aria-hidden="true"></div>
                <div className="loading-text">Loading complaints...</div>
              </div>
            </div>
          )}

          <div
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Showing {filteredComplaints.length} of {complaints.length} complaint
            {complaints.length === 1 ? "" : "s"}
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request Details</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Complainant</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>
                        <span className="req-id-chip">
                          {highlightText(complaint.id)}
                        </span>
                      </td>
                      <td className="req-details">
                        <div className="req-title">
                          {highlightText(complaint.title)}
                        </div>
                        <div className="req-subtitle">
                          {highlightText(complaint.location)}
                        </div>
                      </td>
                      <td>
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getComplaintCategoryColor(
                              complaint.category,
                            ),
                            color: "#ffffff",
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {highlightText(
                            getComplaintCategoryLabel(complaint.category),
                          )}
                        </span>
                      </td>
                      <td className="req-status">
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getStatusColor(complaint.status),
                            color: getStatusTextColor(complaint.status),
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {highlightText(complaint.status)}
                        </span>
                      </td>
                      <td className="req-submitted">
                        {highlightText(complaint.complainant)}
                      </td>
                      <td className="req-submitted">
                        {highlightText(
                          complaint.assignedOfficial || "Unassigned",
                        )}
                      </td>
                      <td className="req-action">
                        <button
                          className="btn-save ar-table-action-btn"
                          onClick={() => openModal(complaint)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No complaints found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* end ar-page-content */}

      {/* Modal Overlay */}
      {assignPopup.open &&
        createPortal(
          <div
            className="ar-modal-overlay"
            style={{ zIndex: 11000 }}
            onClick={() =>
              setAssignPopup({ open: false, title: "", message: "" })
            }
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "460px", width: "92vw", zIndex: 11001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">{assignPopup.title}</h3>
                  <button
                    className="ar-modal-close"
                    onClick={() =>
                      setAssignPopup({ open: false, title: "", message: "" })
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ar-modal-body">
                <p style={{ margin: 0, color: "#334155" }}>
                  {assignPopup.message}
                </p>
              </div>
              <div className="ar-modal-footer">
                <button
                  className="ar-close-btn"
                  onClick={() =>
                    setAssignPopup({ open: false, title: "", message: "" })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Auto-Assign Modal */}
      {autoAssignModalOpen &&
        createPortal(
          <div
            className="ar-modal-overlay"
            onClick={closeAutoAssignModal}
            style={{ zIndex: 12000 }}
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "700px", width: "94vw", zIndex: 12001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">Auto-Assign Complaints</h3>
                  <button
                    className="ar-modal-close"
                    onClick={closeAutoAssignModal}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {autoAssignStep === "filters" && (
                <>
                  <div className="ar-modal-body">
                    {autoAssignLoading ? (
                      <div className="loading-wrap">
                        <div
                          className="loading-spinner"
                          aria-hidden="true"
                        ></div>
                        <div className="loading-text">Loading data...</div>
                      </div>
                    ) : autoAssignError ? (
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "#fee2e2",
                          borderRadius: "0.5rem",
                          color: "#991b1b",
                          marginBottom: "1rem",
                        }}
                      >
                        {autoAssignError}
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: "1.5rem" }}>
                          <div
                            style={{
                              padding: "0.75rem",
                              backgroundColor: "#f0fdf4",
                              borderRadius: "0.5rem",
                              marginBottom: "1rem",
                              borderLeft: "4px solid #10b981",
                            }}
                          >
                            <div
                              style={{ fontSize: "0.875rem", color: "#166534" }}
                            >
                              <strong>Total Unassigned Complaints:</strong>{" "}
                              {unassignedComplaints.length}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#166534" }}
                            >
                              <strong>Matching Current Filters:</strong>{" "}
                              {getFilteredComplaintsPreview().length}
                            </div>
                          </div>

                          <h4
                            style={{ margin: "0 0 0.75rem", color: "#1f2937" }}
                          >
                            Complaint Types ({availableComplaintTypes.length})
                          </h4>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "0.5rem",
                            }}
                          >
                            {getClusteredComplaintTypes().map((ct) => (
                              <label
                                key={ct}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  cursor: "pointer",
                                  padding: "0.5rem",
                                  borderRadius: "0.375rem",
                                  backgroundColor: selectedComplaintTypes[ct]
                                    ? "#dbeafe"
                                    : "#f9fafb",
                                  border: selectedComplaintTypes[ct]
                                    ? "1px solid #0ea5e9"
                                    : "1px solid #e5e7eb",
                                  transition: "all 0.2s",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedComplaintTypes[ct] || false}
                                  onChange={(e) =>
                                    setSelectedComplaintTypes({
                                      ...selectedComplaintTypes,
                                      [ct]: e.target.checked,
                                    })
                                  }
                                  style={{
                                    cursor: "pointer",
                                    width: "16px",
                                    height: "16px",
                                  }}
                                />
                                <span style={{ fontSize: "0.875rem" }}>
                                  {ct}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4
                            style={{ margin: "0 0 0.75rem", color: "#1f2937" }}
                          >
                            Complaint Status ({availableStatuses.length})
                          </h4>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "0.5rem",
                            }}
                          >
                            {availableStatuses.map((st) => (
                              <label
                                key={st}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  cursor: "pointer",
                                  padding: "0.5rem",
                                  borderRadius: "0.375rem",
                                  backgroundColor: selectedStatuses[st]
                                    ? "#dbeafe"
                                    : "#f9fafb",
                                  border: selectedStatuses[st]
                                    ? "1px solid #0ea5e9"
                                    : "1px solid #e5e7eb",
                                  transition: "all 0.2s",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStatuses[st] || false}
                                  onChange={(e) =>
                                    setSelectedStatuses({
                                      ...selectedStatuses,
                                      [st]: e.target.checked,
                                    })
                                  }
                                  style={{
                                    cursor: "pointer",
                                    width: "16px",
                                    height: "16px",
                                  }}
                                />
                                <span style={{ fontSize: "0.875rem" }}>
                                  {st}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4
                            style={{ margin: "0 0 0.75rem", color: "#1f2937" }}
                          >
                            Preview ({getFilteredComplaintsPreview().length})
                          </h4>
                          {getFilteredComplaintsPreview().length === 0 ? (
                            <div
                              style={{
                                padding: "1rem",
                                backgroundColor: "#f3f4f6",
                                borderRadius: "0.5rem",
                                textAlign: "center",
                                color: "#6b7280",
                              }}
                            >
                              No complaints match the selected filters
                            </div>
                          ) : (
                            <div
                              style={{
                                overflowX: "auto",
                                borderRadius: "0.5rem",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "0.875rem",
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      backgroundColor: "#f3f4f6",
                                      borderBottom: "1px solid #e5e7eb",
                                    }}
                                  >
                                    <th
                                      style={{
                                        padding: "0.75rem",
                                        textAlign: "left",
                                        fontWeight: "600",
                                        color: "#1f2937",
                                      }}
                                    >
                                      Complaint ID
                                    </th>
                                    <th
                                      style={{
                                        padding: "0.75rem",
                                        textAlign: "left",
                                        fontWeight: "600",
                                        color: "#1f2937",
                                      }}
                                    >
                                      Complaint Type
                                    </th>
                                    <th
                                      style={{
                                        padding: "0.75rem",
                                        textAlign: "left",
                                        fontWeight: "600",
                                        color: "#1f2937",
                                      }}
                                    >
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {getFilteredComplaintsPreview()
                                    .slice(0, 10)
                                    .map((comp, idx) => (
                                      <tr
                                        key={comp.id}
                                        style={{
                                          backgroundColor:
                                            idx % 2 === 0
                                              ? "#ffffff"
                                              : "#f9fafb",
                                          borderBottom: "1px solid #e5e7eb",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "0.75rem",
                                            color: "#374151",
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          {String(comp.id).substring(0, 8)}...
                                        </td>
                                        <td
                                          style={{
                                            padding: "0.75rem",
                                            color: "#374151",
                                          }}
                                        >
                                          {comp.complaint_type}
                                        </td>
                                        <td
                                          style={{
                                            padding: "0.75rem",
                                            color: "#374151",
                                          }}
                                        >
                                          <span
                                            style={{
                                              display: "inline-block",
                                              padding: "0.25rem 0.75rem",
                                              backgroundColor: "#e0e7ff",
                                              color: "#3730a3",
                                              borderRadius: "9999px",
                                              fontSize: "0.75rem",
                                              fontWeight: "500",
                                            }}
                                          >
                                            {normalizeStatus(comp.status)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                              {getFilteredComplaintsPreview().length > 10 && (
                                <div
                                  style={{
                                    padding: "0.75rem",
                                    backgroundColor: "#f9fafb",
                                    textAlign: "center",
                                    fontSize: "0.875rem",
                                    color: "#6b7280",
                                    borderTop: "1px solid #e5e7eb",
                                  }}
                                >
                                  ...and{" "}
                                  {getFilteredComplaintsPreview().length - 10}{" "}
                                  more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ar-modal-footer">
                    <button
                      className="ar-close-btn"
                      onClick={closeAutoAssignModal}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleProceedToOfficials}
                      disabled={autoAssignLoading}
                    >
                      Next: Select Officials
                    </button>
                  </div>
                </>
              )}

              {autoAssignStep === "officials" && (
                <>
                  <div className="ar-modal-body">
                    {presentOfficials.length === 0 ? (
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "#fee2e2",
                          borderRadius: "0.5rem",
                          color: "#991b1b",
                        }}
                      >
                        No officials present today
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: "1rem" }}>
                          <p
                            style={{
                              margin: "0 0 0.5rem",
                              fontSize: "0.875rem",
                              color: "#6b7280",
                            }}
                          >
                            Complaints to assign:{" "}
                            <strong>
                              {filteredUnassignedComplaints.length}
                            </strong>
                          </p>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "0.875rem",
                              color: "#6b7280",
                            }}
                          >
                            Officials present:{" "}
                            <strong>{presentOfficials.length}</strong>
                          </p>
                        </div>

                        <h4
                          style={{ margin: "1rem 0 0.75rem", color: "#1f2937" }}
                        >
                          Select Officials to Assign To
                        </h4>
                        <div
                          style={{
                            display: "grid",
                            gap: "0.75rem",
                          }}
                        >
                          {presentOfficials.map((official) => (
                            <label
                              key={official.uid}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.75rem",
                                border: "1px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selectedOfficials[official.uid] || false
                                }
                                onChange={(e) =>
                                  setSelectedOfficials({
                                    ...selectedOfficials,
                                    [official.uid]: e.target.checked,
                                  })
                                }
                              />
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    fontSize: "0.875rem",
                                    color: "#1f2937",
                                  }}
                                >
                                  {official.firstName} {official.lastName}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#6b7280",
                                  }}
                                >
                                  {official.position}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ar-modal-footer">
                    <button
                      className="ar-close-btn"
                      onClick={() => setAutoAssignStep("filters")}
                    >
                      Back
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleProceedToConfirm}
                      disabled={presentOfficials.length === 0}
                    >
                      Next: Confirm Distribution
                    </button>
                  </div>
                </>
              )}

              {autoAssignStep === "confirm" && (
                <>
                  <div className="ar-modal-body">
                    {autoAssignError && (
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "#fee2e2",
                          borderRadius: "0.5rem",
                          color: "#991b1b",
                          marginBottom: "1rem",
                        }}
                      >
                        {autoAssignError}
                      </div>
                    )}

                    <div style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ margin: "0 0 0.75rem", color: "#1f2937" }}>
                        Assignment Distribution
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gap: "0.75rem",
                        }}
                      >
                        {assignmentDistribution.map((dist) => (
                          <div
                            key={dist.uid}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: "#f3f4f6",
                              borderRadius: "0.5rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 500,
                                  fontSize: "0.875rem",
                                  color: "#1f2937",
                                }}
                              >
                                {dist.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                }}
                              >
                                {dist.position}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: "1.125rem",
                                fontWeight: 700,
                                color: "#2563eb",
                              }}
                            >
                              {dist.count} items
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#ecfdf5",
                        borderRadius: "0.5rem",
                        color: "#065f46",
                        fontSize: "0.875rem",
                      }}
                    >
                      <strong>Total:</strong>{" "}
                      {filteredUnassignedComplaints.length} complaints will be
                      assigned
                    </div>
                  </div>

                  <div className="ar-modal-footer">
                    <button
                      className="ar-close-btn"
                      onClick={() => setAutoAssignStep("officials")}
                      disabled={autoAssignLoading}
                    >
                      Back
                    </button>
                    <button
                      className="btn-save"
                      onClick={handleConfirmAssignment}
                      disabled={autoAssignLoading}
                    >
                      {autoAssignLoading ? "Assigning..." : "Confirm & Assign"}
                    </button>
                  </div>
                </>
              )}

              {autoAssignStep === "executing" && (
                <>
                  <div className="ar-modal-body">
                    {autoAssignResult && autoAssignResult.success ? (
                      <div
                        style={{
                          padding: "1.5rem",
                          backgroundColor: "#ecfdf5",
                          borderRadius: "0.5rem",
                          color: "#065f46",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            marginBottom: "0.5rem",
                          }}
                        >
                          ✓ Assignment Complete!
                        </div>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            marginBottom: "1rem",
                          }}
                        >
                          {autoAssignResult.successCount} complaint
                          {autoAssignResult.successCount === 1 ? "" : "s"}{" "}
                          assigned successfully
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "#fee2e2",
                          borderRadius: "0.5rem",
                          color: "#991b1b",
                        }}
                      >
                        {autoAssignError || "Assignment failed"}
                      </div>
                    )}
                  </div>

                  <div className="ar-modal-footer">
                    <button
                      className="ar-close-btn"
                      onClick={closeAutoAssignModal}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Overlay */}
      {assignPopup.open &&
        createPortal(
          <div
            className="ar-modal-overlay"
            style={{ zIndex: 11000 }}
            onClick={() =>
              setAssignPopup({ open: false, title: "", message: "" })
            }
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "460px", width: "92vw", zIndex: 11001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">{assignPopup.title}</h3>
                  <button
                    className="ar-modal-close"
                    onClick={() =>
                      setAssignPopup({ open: false, title: "", message: "" })
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ar-modal-body">
                <p style={{ margin: 0, color: "#334155" }}>
                  {assignPopup.message}
                </p>
              </div>
              <div className="ar-modal-footer">
                <button
                  className="ar-close-btn"
                  onClick={() =>
                    setAssignPopup({ open: false, title: "", message: "" })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Overlay */}
      {isModalOpen &&
        createPortal(
          <div
            className="ar-modal-overlay request-detail-overlay"
            onClick={closeModal}
          />,
          document.body,
        )}

      {/* Modal */}
      {isModalOpen &&
        selectedComplaint &&
        createPortal(
          <div className="ar-modal modal-dialog request-detail-dialog">
            {/* Header */}
            <div className="ar-modal-header">
              <div className="ar-modal-header-top">
                <h3 className="ar-modal-title">{selectedComplaint.title}</h3>
                <button className="ar-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>
              <div className="ar-modal-badges">
                <span
                  className="ar-status-badge-modal"
                  style={{
                    backgroundColor: getStatusColor(selectedComplaint.status),
                    color: getStatusTextColor(selectedComplaint.status),
                    borderColor: "rgba(0,0,0,0.10)",
                  }}
                >
                  {selectedComplaint.status.toUpperCase()}
                </span>
                <span className="ar-admin-tag">System Admin View</span>
              </div>
            </div>

            {/* Body */}
            <div className="ar-modal-body">
              <div className="ar-metadata-grid">
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Complainant</label>
                  <p className="ar-metadata-value">
                    {selectedComplaint.complainant}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Location</label>
                  <p className="ar-metadata-value">
                    {selectedComplaint.location}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Priority</label>
                  <p className="ar-metadata-value">
                    {selectedComplaint.priority}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Submitted</label>
                  <p className="ar-metadata-value">{selectedComplaint.date}</p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Last Update</label>
                  <p className="ar-metadata-value">
                    {selectedComplaint.lastUpdate}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Assigned Official</label>
                  <p className="ar-metadata-value ar-official-value">
                    {selectedComplaint.assignedOfficial || "Unassigned"}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Category</label>
                  <p className="ar-metadata-value">
                    <span
                      className="ar-status-badge"
                      style={{
                        backgroundColor: getComplaintCategoryColor(
                          selectedComplaint.category,
                        ),
                        color: "#ffffff",
                        borderColor: "rgba(0,0,0,0.10)",
                      }}
                    >
                      {getComplaintCategoryLabel(selectedComplaint.category)}
                    </span>
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Settlement</label>
                  <p className="ar-metadata-value">
                    <span
                      className="ar-status-badge"
                      style={{
                        backgroundColor: selectedComplaint.mediationAccepted
                          ? "#10b981"
                          : "#e2e8f0",
                        color: selectedComplaint.mediationAccepted
                          ? "#ffffff"
                          : "#334155",
                        borderColor: "rgba(0,0,0,0.10)",
                      }}
                    >
                      {selectedComplaint.mediationAccepted
                        ? "Accepted"
                        : "Not Accepted"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Complaint Description</h4>
                <div className="ar-description-box">
                  {selectedComplaint.description}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Official Remarks / Notes</h4>
                <div className="ar-response-box">
                  {selectedComplaint.remarks}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Transfer Assignment</h4>
                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search active official by name or position"
                      value={officialSearch}
                      onFocus={() => setShowOfficialOptions(true)}
                      onChange={(e) => {
                        setOfficialSearch(e.target.value);
                        setSelectedOfficialUid("");
                        setShowOfficialOptions(true);
                      }}
                      className="ar-input"
                      style={{
                        width: "100%",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        padding: "0.625rem 0.75rem",
                      }}
                    />

                    {showOfficialOptions && !loadingOfficials && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 0.3rem)",
                          left: 0,
                          right: 0,
                          maxHeight: "180px",
                          overflowY: "auto",
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          zIndex: 20,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                        }}
                      >
                        {filteredOfficials.length > 0 ? (
                          filteredOfficials.map((official) => (
                            <button
                              key={official.uid}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handlePickOfficial(official)}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "0.625rem 0.75rem",
                                border: "none",
                                borderBottom: "1px solid #f1f5f9",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              {getOfficialLabel(official)}
                            </button>
                          ))
                        ) : (
                          <div
                            style={{
                              padding: "0.625rem 0.75rem",
                              color: "#64748b",
                            }}
                          >
                            No matching active officials.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-save"
                    onClick={handleTransferComplaint}
                    disabled={
                      !selectedOfficialUid ||
                      loadingOfficials ||
                      transferringAssignment
                    }
                    style={{ justifySelf: "start" }}
                  >
                    {transferringAssignment
                      ? "Transferring..."
                      : "Transfer Assignment"}
                  </button>
                </div>
              </div>

              <div className="history-section">
                <div className="history-header">
                  <h3>History</h3>
                </div>
                {historyLoading ? (
                  <p className="history-loading">Loading history...</p>
                ) : history && history.length > 0 ? (
                  <ul className="history-list">
                    {history.map((h, idx) => {
                      const date = new Date(h.updated_at || h.created_at);
                      const statusValue =
                        h.status ||
                        h.complaint_status ||
                        h.request_status ||
                        "";
                      const rawStatus = statusValue
                        .toUpperCase()
                        .replace(/ /g, "_");
                      const statusLabel = statusValue
                        ? statusValue.replace(/_/g, " ").toUpperCase()
                        : "";
                      const dotColor = STATUS_COLOR_MAP[rawStatus] || "#6B7280";
                      return (
                        <li
                          key={idx}
                          className="history-item"
                          style={{ "--dot-color": dotColor }}
                        >
                          <div className="history-row">
                            <div className="history-row-top">
                              <span
                                className="history-status"
                                style={{ backgroundColor: dotColor }}
                              >
                                {statusLabel}
                              </span>
                              <span className="history-user">
                                {h.updater_name || "System"}
                              </span>
                            </div>
                            <span className="history-date">
                              {date.toLocaleString()}
                            </span>
                            {h.remarks && (
                              <div className="history-remarks">{h.remarks}</div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="no-history">No history available.</p>
                )}
              </div>

              <div
                className="admin-mediations-detail-section"
                style={{ marginTop: "2rem" }}
              >
                <h4 className="admin-mediations-detail-heading">
                  Settlement Timeline
                  <span className="admin-mediations-timeline-count">
                    {mediationHistory ? mediationHistory.length : 0} record(s)
                  </span>
                </h4>

                {mediationHistoryLoading ? (
                  <p className="history-loading">
                    Loading settlement history...
                  </p>
                ) : mediationHistory && mediationHistory.length > 0 ? (
                  <div className="admin-mediations-timeline">
                    {mediationHistory.map((entry, idx) => {
                      const entryTypeStyle = getTimelineTypeStyle(entry.type);
                      const entryStatusStyle = getTimelineStatusStyle(
                        entry.status,
                      );
                      const isActive = idx === mediationHistory.length - 1;

                      return (
                        <div
                          className={`admin-mediations-timeline-node${isActive ? " active" : ""}`}
                          key={entry.id || idx}
                        >
                          <div className="admin-mediations-timeline-dot" />
                          {idx < mediationHistory.length - 1 && (
                            <div className="admin-mediations-timeline-line" />
                          )}
                          <div className="admin-mediations-timeline-content">
                            <div className="admin-mediations-timeline-top">
                              <span className="admin-mediations-timeline-id">
                                #{entry.id || "N/A"}
                              </span>
                              <span
                                className="admin-mediations-pill small"
                                style={{
                                  color: entryTypeStyle.color,
                                  background: entryTypeStyle.bg,
                                }}
                              >
                                {titleCaseTimeline(entry.type || "mediation")}
                              </span>
                              <span
                                className="admin-mediations-pill small"
                                style={{
                                  color: entryStatusStyle.color,
                                  background: entryStatusStyle.bg,
                                }}
                              >
                                {titleCaseTimeline(entry.status || "scheduled")}
                              </span>
                              {isActive && (
                                <span className="admin-mediations-pill small current">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="admin-mediations-timeline-meta">
                              <div>
                                <span className="admin-mediations-timeline-label">
                                  Session
                                </span>
                                <span className="admin-mediations-timeline-val">
                                  {formatPhilDateTimeExt(entry.session_start)} →{" "}
                                  {formatPhilTimeOnlyExt(entry.session_end)}
                                </span>
                              </div>
                              <div>
                                <span className="admin-mediations-timeline-label">
                                  Created
                                </span>
                                <span className="admin-mediations-timeline-val">
                                  {formatPhilDateTimeExt(entry.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-mediations-muted">
                    No settlement timeline available for this complaint.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="ar-modal-footer">
              <button className="ar-close-btn" onClick={closeModal}>
                Close Monitor
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
