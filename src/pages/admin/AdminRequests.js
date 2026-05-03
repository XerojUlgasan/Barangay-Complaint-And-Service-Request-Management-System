import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import {
  getRequests,
  getRequestHistory,
  transferRequestAssignment,
} from "../../supabse_db/request/request";
import { getActiveOfficialsForAssignment } from "../../supabse_db/official/official";
import {
  getCertificates,
  insertCertificate,
  updateCertificate,
} from "../../supabse_db/certificate/certificate";
import {
  REQUEST_STATUS_OPTIONS,
  formatRequestStatus,
  getRequestStatusColor,
  getRequestStatusTextColor,
} from "../../utils/requestStatuses";
import {
  getUnassignedRequests,
  getPresentOfficialsWithDetails,
  bulkAssignRequests,
} from "../../supabse_db/utils/autoAssign";

const getStatusColor = (statusValue) => getRequestStatusColor(statusValue);
const getStatusTextColor = (statusValue) =>
  getRequestStatusTextColor(statusValue);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AdminRequests() {
  const location = useLocation();
  const [selectedRequestStatus, setSelectedRequestStatus] =
    useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
  const [certificatesModalOpen, setCertificatesModalOpen] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [certificatePopupOpen, setCertificatePopupOpen] = useState(false);
  const [certificateFormMode, setCertificateFormMode] = useState("add");
  const [editingCertificateId, setEditingCertificateId] = useState(null);
  const [certificateTypeInput, setCertificateTypeInput] = useState("");
  const [certificateRequirementsInput, setCertificateRequirementsInput] =
    useState("");
  const [certificateFormSubmitting, setCertificateFormSubmitting] =
    useState(false);
  const [certificatePopupMessage, setCertificatePopupMessage] = useState({
    open: false,
    title: "",
    message: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Auto-assign feature states
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [autoAssignStep, setAutoAssignStep] = useState("filters"); // 'filters', 'officials', 'confirm', 'executing'
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState(null);

  // Unassigned requests and their filters
  const [unassignedRequests, setUnassignedRequests] = useState([]);
  const [availableCertTypes, setAvailableCertTypes] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [selectedCertTypes, setSelectedCertTypes] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // Available officials for assignment
  const [presentOfficials, setPresentOfficials] = useState([]);
  const [selectedOfficials, setSelectedOfficials] = useState({});

  // Confirmation and results
  const [filteredUnassignedRequests, setFilteredUnassignedRequests] = useState(
    [],
  );
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
    if (location.state?.selectedItemId && requests.length > 0) {
      const item = requests.find((r) => r.id === location.state.selectedItemId);
      if (item) {
        openModal(item);
      }
    }
  }, [location.state, requests]);

  const transformRequestData = (dbRequest) => {
    return {
      id: dbRequest.id,
      title: dbRequest.subject || "Untitled Request",
      subtitle: dbRequest.certificate_type || "Service Request",
      status: formatRequestStatus(dbRequest.request_status || dbRequest.status),
      submittedBy: dbRequest.requester_name || "Unknown",
      date: dbRequest.created_at
        ? new Date(dbRequest.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbRequest.updated_at
        ? new Date(dbRequest.updated_at).toISOString().split("T")[0]
        : dbRequest.created_at
          ? new Date(dbRequest.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficialUid: dbRequest.assigned_official_id || "",
      assignedOfficial: dbRequest.assigned_official_name || "",
      description: dbRequest.description || "No description provided",
      response: dbRequest.remarks || "No response yet",
    };
  };

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      setErrorRequests(null);
      console.log("AdminRequests: Starting fetch...");
      const result = await getRequests();
      console.log("AdminRequests: getRequests result:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("AdminRequests: Raw data from DB:", result.data);
        const transformedRequests = result.data.map((req) =>
          transformRequestData(req),
        );
        console.log("AdminRequests: Transformed data:", transformedRequests);
        setRequests(transformedRequests);
      } else {
        console.error(
          "AdminRequests: Failed to fetch requests:",
          result.message,
        );
        setErrorRequests(result.message || "Failed to fetch requests");
        setRequests([]);
      }
    } catch (err) {
      console.error("AdminRequests: Catch error:", err);
      setErrorRequests("Error fetching requests: " + err.message);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on status, search query, and date range
  const filteredRequests = requests.filter((req) => {
    // Status filter
    const statusMatch =
      selectedRequestStatus === "All Status" ||
      req.status === selectedRequestStatus;

    // Search filter
    const searchableColumns = [
      req.id,
      req.title,
      req.subtitle,
      req.status,
      req.submittedBy,
      req.assignedOfficial || "Unassigned",
      req.date,
      req.lastUpdate,
      req.description,
      req.response,
    ]
      .join(" ")
      .toLowerCase();

    const searchMatch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableColumns.includes(term));

    // Date filter
    const reqDate = new Date(req.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch = (!start || reqDate >= start) && (!end || reqDate <= end);

    return statusMatch && searchMatch && dateMatch;
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

  // blur handled via inline className on page-content wrapper

  const openModal = (request) => {
    setSelectedRequest(request);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setIsModalOpen(true);
    fetchHistory(request.id);
    fetchActiveOfficials();
  };

  const openCertificatesModal = async () => {
    setCertificatesModalOpen(true);
    await fetchCertificates();
  };

  const closeCertificatesModal = () => {
    setCertificatesModalOpen(false);
    setCertificatePopupOpen(false);
    setCertificatePopupMessage({ open: false, title: "", message: "" });
    setCertificateTypeInput("");
    setCertificateRequirementsInput("");
    setEditingCertificateId(null);
    setCertificateFormMode("add");
  };

  const openAddCertificatePopup = () => {
    setCertificateFormMode("add");
    setEditingCertificateId(null);
    setCertificateTypeInput("");
    setCertificateRequirementsInput("");
    setCertificatePopupOpen(true);
  };

  const openEditCertificatePopup = (certificate) => {
    setCertificateFormMode("edit");
    setEditingCertificateId(certificate.id);
    setCertificateTypeInput(certificate.type || "");
    setCertificateRequirementsInput(
      Array.isArray(certificate.requirements)
        ? certificate.requirements.join("\n")
        : "",
    );
    setCertificatePopupOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setTimeout(() => setSelectedRequest(null), 300);
  };

  const fetchCertificates = async () => {
    setLoadingCertificates(true);
    try {
      const result = await getCertificates();
      if (result.success && Array.isArray(result.data)) {
        setCertificates(result.data);
      } else {
        setCertificates([]);
        if (result.message) {
          setCertificatePopupMessage({
            open: true,
            title: "Unable to Load Certificates",
            message: result.message,
          });
        }
      }
    } catch (err) {
      setCertificates([]);
      setCertificatePopupMessage({
        open: true,
        title: "Unable to Load Certificates",
        message: err.message || "Failed to load certificates",
      });
    } finally {
      setLoadingCertificates(false);
    }
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

  const fetchHistory = async (requestId) => {
    if (!requestId) return;
    setHistoryLoading(true);
    try {
      const result = await getRequestHistory(requestId);
      if (result.success) {
        setHistory(result.data || []);
      } else {
        console.error("AdminRequests: history fetch failed", result.message);
        setHistory([]);
      }
    } catch (err) {
      console.error("AdminRequests: error fetching history", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const filteredOfficials = activeOfficials.filter((official) => {
    if (official.uid === selectedRequest?.assignedOfficialUid) {
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

  const handleTransferRequest = async () => {
    if (
      !selectedRequest?.id ||
      !selectedOfficialUid ||
      transferringAssignment
    ) {
      return;
    }

    setTransferringAssignment(true);

    try {
      const result = await transferRequestAssignment(
        selectedRequest.id,
        selectedOfficialUid,
      );

      if (!result.success) {
        setAssignPopup({
          open: true,
          title: "Transfer Failed",
          message: result.message || "Unable to transfer request assignment.",
        });
        return;
      }

      const assignedOfficialName = result.assignedOfficialName || "Assigned";

      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              assignedOfficialUid: selectedOfficialUid,
              assignedOfficial: assignedOfficialName,
              lastUpdate: new Date().toISOString().split("T")[0],
            }
          : prev,
      );

      setRequests((prev) =>
        prev.map((request) =>
          request.id === selectedRequest.id
            ? {
                ...request,
                assignedOfficialUid: selectedOfficialUid,
                assignedOfficial: assignedOfficialName,
                lastUpdate: new Date().toISOString().split("T")[0],
              }
            : request,
        ),
      );

      await fetchHistory(selectedRequest.id);

      setAssignPopup({
        open: true,
        title: "Assignment Transferred",
        message: `Request #${selectedRequest.id} is now assigned to ${assignedOfficialName}.`,
      });
    } finally {
      setTransferringAssignment(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (certificateFormSubmitting) return;

    setCertificateFormSubmitting(true);
    try {
      const payload = {
        type: certificateTypeInput,
        requirementsText: certificateRequirementsInput,
      };

      const result =
        certificateFormMode === "edit" && editingCertificateId != null
          ? await updateCertificate(editingCertificateId, payload)
          : await insertCertificate(payload);

      if (!result.success) {
        setCertificatePopupMessage({
          open: true,
          title:
            certificateFormMode === "edit" ? "Update Failed" : "Add Failed",
          message: result.message || "Unable to save certificate.",
        });
        return;
      }

      await fetchCertificates();
      setCertificatePopupOpen(false);
      setEditingCertificateId(null);
      setCertificateTypeInput("");
      setCertificateRequirementsInput("");
      setCertificatePopupMessage({
        open: true,
        title:
          certificateFormMode === "edit"
            ? "Certificate Updated"
            : "Certificate Added",
        message:
          certificateFormMode === "edit"
            ? "The certificate details were updated successfully."
            : "The new certificate was added successfully.",
      });
    } finally {
      setCertificateFormSubmitting(false);
    }
  };

  // ============== AUTO-ASSIGN FUNCTIONS ==============

  const openAutoAssignModal = async () => {
    setAutoAssignModalOpen(true);
    setAutoAssignStep("filters");
    setAutoAssignError(null);
    setAutoAssignLoading(true);

    try {
      // Fetch unassigned requests
      const reqResult = await getUnassignedRequests();
      if (!reqResult.success || reqResult.data.length === 0) {
        setAutoAssignError(reqResult.message || "No unassigned requests found");
        setAutoAssignLoading(false);
        return;
      }

      setUnassignedRequests(reqResult.data);

      // Extract unique certificate types and statuses
      const certTypes = [
        ...new Set(reqResult.data.map((r) => r.certificate_type)),
      ];
      const statuses = [
        ...new Set(
          reqResult.data.map((r) =>
            formatRequestStatus(r.request_status || r.status),
          ),
        ),
      ];

      setAvailableCertTypes(certTypes);
      setAvailableStatuses(statuses);

      // Initialize all as unchecked
      const certTypeObj = {};
      certTypes.forEach((ct) => {
        certTypeObj[ct] = false;
      });
      setSelectedCertTypes(certTypeObj);

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
    setUnassignedRequests([]);
    setAvailableCertTypes([]);
    setAvailableStatuses([]);
    setSelectedCertTypes({});
    setSelectedStatuses({});
    setPresentOfficials([]);
    setSelectedOfficials({});
    setFilteredUnassignedRequests([]);
    setAssignmentDistribution([]);
    setAutoAssignResult(null);
  };

  const handleProceedToOfficials = () => {
    const selectedCertCount =
      Object.values(selectedCertTypes).filter(Boolean).length;
    const selectedStatusCount =
      Object.values(selectedStatuses).filter(Boolean).length;

    if (selectedCertCount === 0 || selectedStatusCount === 0) {
      setAutoAssignError(
        "Please select at least one certificate type and status",
      );
      return;
    }

    // Filter unassigned requests based on selections
    const filtered = unassignedRequests.filter((req) => {
      const certTypeMatch = selectedCertTypes[req.certificate_type];
      const statusMatch =
        selectedStatuses[formatRequestStatus(req.request_status || req.status)];
      return certTypeMatch && statusMatch;
    });

    if (filtered.length === 0) {
      setAutoAssignError("No requests match the selected filters");
      return;
    }

    setFilteredUnassignedRequests(filtered);
    setAutoAssignStep("officials");
    setAutoAssignError(null);
  };

  // Calculate currently filtered requests for preview
  const getFilteredRequestsPreview = () => {
    const selectedCertCount =
      Object.values(selectedCertTypes).filter(Boolean).length;
    const selectedStatusCount =
      Object.values(selectedStatuses).filter(Boolean).length;

    if (selectedCertCount === 0 || selectedStatusCount === 0) {
      return unassignedRequests;
    }

    return unassignedRequests.filter((req) => {
      const certTypeMatch = selectedCertTypes[req.certificate_type];
      const statusMatch =
        selectedStatuses[formatRequestStatus(req.request_status || req.status)];
      return certTypeMatch && statusMatch;
    });
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
    const itemCount = filteredUnassignedRequests.length;
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
      const requestIds = filteredUnassignedRequests.map((r) => r.id);
      const selectedOfficialUids = Object.entries(selectedOfficials)
        .filter(([, checked]) => checked)
        .map(([uid]) => uid);

      const result = await bulkAssignRequests(requestIds, selectedOfficialUids);

      if (!result.success) {
        setAutoAssignError(
          `Assignment failed: ${result.failureCount} items could not be assigned`,
        );
        setAutoAssignLoading(false);
        setAutoAssignStep("confirm");
        return;
      }

      setAutoAssignResult(result);
      await fetchRequests(); // Refresh the requests list
      setAutoAssignLoading(false);
    } catch (err) {
      setAutoAssignError("Error during assignment: " + err.message);
      setAutoAssignLoading(false);
      setAutoAssignStep("confirm");
    }
  };

  const renderCertificateRequirements = (requirements) => {
    if (!Array.isArray(requirements) || requirements.length === 0) {
      return <span style={{ color: "#6b7280" }}>No requirements listed.</span>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {requirements.map((requirement, index) => (
          <span
            key={`${requirement}-${index}`}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "999px",
              background: "#e2e8f0",
              color: "#0f172a",
              fontSize: "0.875rem",
            }}
          >
            {requirement}
          </span>
        ))}
      </div>
    );
  };

  const statusOptions = [
    "All Status",
    ...REQUEST_STATUS_OPTIONS.map((status) => status.label),
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
            <h3>System-wide Requests</h3>
            <p className="muted">
              Monitor all service requests across the barangay.
            </p>
          </div>
        </div>

        {/* REQUESTS SECTION */}
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
                placeholder="Search by title, type, requester, or description..."
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
              Auto Assign Requests
            </button>

            <button
              type="button"
              onClick={openCertificatesModal}
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                background: "#334155",
                color: "#f8fafc",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Manage Certificates
            </button>

            <div
              className="status-filter-wrapper"
              style={{ marginBottom: 0, position: "relative" }}
            >
              <button
                className="status-filter-btn"
                onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
              >
                {selectedRequestStatus}
                <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
              </button>
              {requestDropdownOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 999 }}
                    onClick={() => setRequestDropdownOpen(false)}
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
                          setSelectedRequestStatus(option);
                          setRequestDropdownOpen(false);
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

          {errorRequests && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fee2e2",
                borderRadius: "0.5rem",
                color: "#991b1b",
              }}
            >
              Error: {errorRequests}
            </div>
          )}

          {loadingRequests && (
            <div style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="loading-wrap">
                <div className="loading-spinner" aria-hidden="true"></div>
                <div className="loading-text">Loading requests...</div>
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
            Showing {filteredRequests.length} of {requests.length} request
            {requests.length === 1 ? "" : "s"}
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request Details</th>
                  <th>Status</th>
                  <th>Submitted By</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <span className="req-id-chip">
                          {highlightText(request.id)}
                        </span>
                      </td>
                      <td className="req-details">
                        <div className="req-title">
                          {highlightText(request.title)}
                        </div>
                        <div className="req-subtitle">
                          {highlightText(request.subtitle)}
                        </div>
                      </td>
                      <td className="req-status">
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getStatusColor(request.status),
                            color: getStatusTextColor(request.status),
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {highlightText(request.status)}
                        </span>
                      </td>
                      <td className="req-submitted">
                        {highlightText(request.submittedBy)}
                      </td>
                      <td className="req-submitted">
                        {highlightText(
                          request.assignedOfficial || "Unassigned",
                        )}
                      </td>
                      <td className="req-action">
                        <button
                          className="btn-save ar-table-action-btn"
                          onClick={() => openModal(request)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No requests found matching your filters.
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
      {certificatePopupMessage.open &&
        createPortal(
          <div
            className="ar-modal-overlay"
            onClick={() =>
              setCertificatePopupMessage({
                open: false,
                title: "",
                message: "",
              })
            }
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "460px", width: "92vw" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">
                    {certificatePopupMessage.title}
                  </h3>
                  <button
                    className="ar-modal-close"
                    onClick={() =>
                      setCertificatePopupMessage({
                        open: false,
                        title: "",
                        message: "",
                      })
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ar-modal-body">
                <p style={{ margin: 0, color: "#334155" }}>
                  {certificatePopupMessage.message}
                </p>
              </div>
              <div className="ar-modal-footer">
                <button
                  className="ar-close-btn"
                  onClick={() =>
                    setCertificatePopupMessage({
                      open: false,
                      title: "",
                      message: "",
                    })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {certificatesModalOpen &&
        createPortal(
          <div className="ar-modal-overlay" onClick={closeCertificatesModal}>
            <div
              className="ar-modal"
              style={{ maxWidth: "920px", width: "94vw" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">Manage Certificates</h3>
                  <button
                    className="ar-modal-close"
                    onClick={closeCertificatesModal}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div
                className="ar-modal-body"
                style={{ display: "grid", gap: "1rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, color: "#0f172a" }}>
                      Certificate Types
                    </h4>
                    <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
                      Type names and their requirements.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-save"
                    onClick={openAddCertificatePopup}
                  >
                    Add Certificate
                  </button>
                </div>

                {loadingCertificates ? (
                  <div className="loading-wrap">
                    <div className="loading-spinner" aria-hidden="true"></div>
                    <div className="loading-text">Loading certificates...</div>
                  </div>
                ) : certificates.length > 0 ? (
                  <div
                    className="requests-table-card"
                    style={{ marginBottom: 0 }}
                  >
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Certificate Type</th>
                          <th>Requirements</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certificates.map((certificate) => (
                          <tr key={certificate.id}>
                            <td>
                              <span className="req-id-chip">
                                {certificate.id}
                              </span>
                            </td>
                            <td className="req-details">
                              <div className="req-title">
                                {certificate.type}
                              </div>
                            </td>
                            <td>
                              {renderCertificateRequirements(
                                certificate.requirements,
                              )}
                            </td>
                            <td className="req-action">
                              <button
                                className="btn-save ar-table-action-btn"
                                onClick={() =>
                                  openEditCertificatePopup(certificate)
                                }
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#64748b" }}>
                    No certificates found.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {certificatePopupOpen &&
        createPortal(
          <div
            className="ar-modal-overlay"
            onClick={() => setCertificatePopupOpen(false)}
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "640px", width: "92vw" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">
                    {certificateFormMode === "edit"
                      ? "Edit Certificate"
                      : "Add Certificate"}
                  </h3>
                  <button
                    className="ar-modal-close"
                    onClick={() => setCertificatePopupOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div
                className="ar-modal-body"
                style={{ display: "grid", gap: "1rem" }}
              >
                <div>
                  <label
                    className="ar-metadata-label"
                    style={{ display: "block", marginBottom: "0.35rem" }}
                  >
                    Certificate Type
                  </label>
                  <input
                    type="text"
                    value={certificateTypeInput}
                    onChange={(e) => setCertificateTypeInput(e.target.value)}
                    placeholder="e.g. Barangay Clearance"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="ar-metadata-label"
                    style={{ display: "block", marginBottom: "0.35rem" }}
                  >
                    Requirements
                  </label>
                  <textarea
                    rows="6"
                    value={certificateRequirementsInput}
                    onChange={(e) =>
                      setCertificateRequirementsInput(e.target.value)
                    }
                    placeholder={
                      "One requirement per line\nExample:\nValid ID\nProof of Residency"
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
              <div className="ar-modal-footer">
                <button
                  className="ar-close-btn"
                  onClick={() => setCertificatePopupOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={handleSaveCertificate}
                  disabled={certificateFormSubmitting}
                >
                  {certificateFormSubmitting
                    ? "Saving..."
                    : certificateFormMode === "edit"
                      ? "Save Changes"
                      : "Add Certificate"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

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
                  <h3 className="ar-modal-title">Auto-Assign Requests</h3>
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
                              <strong>Total Unassigned Requests:</strong>{" "}
                              {unassignedRequests.length}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#166534" }}
                            >
                              <strong>Matching Current Filters:</strong>{" "}
                              {getFilteredRequestsPreview().length}
                            </div>
                          </div>

                          <h4
                            style={{ margin: "0 0 0.75rem", color: "#1f2937" }}
                          >
                            Certificate Types ({availableCertTypes.length})
                          </h4>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "0.5rem",
                            }}
                          >
                            {availableCertTypes.map((ct) => (
                              <label
                                key={ct}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  cursor: "pointer",
                                  padding: "0.5rem",
                                  borderRadius: "0.375rem",
                                  backgroundColor: selectedCertTypes[ct]
                                    ? "#dbeafe"
                                    : "#f9fafb",
                                  border: selectedCertTypes[ct]
                                    ? "1px solid #0ea5e9"
                                    : "1px solid #e5e7eb",
                                  transition: "all 0.2s",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCertTypes[ct] || false}
                                  onChange={(e) =>
                                    setSelectedCertTypes({
                                      ...selectedCertTypes,
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

                        <div style={{ marginBottom: "1.5rem" }}>
                          <h4
                            style={{ margin: "0 0 0.75rem", color: "#1f2937" }}
                          >
                            Request Status ({availableStatuses.length})
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
                            Preview ({getFilteredRequestsPreview().length})
                          </h4>
                          {getFilteredRequestsPreview().length === 0 ? (
                            <div
                              style={{
                                padding: "1rem",
                                backgroundColor: "#f3f4f6",
                                borderRadius: "0.5rem",
                                textAlign: "center",
                                color: "#6b7280",
                              }}
                            >
                              No requests match the selected filters
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
                                      Request ID
                                    </th>
                                    <th
                                      style={{
                                        padding: "0.75rem",
                                        textAlign: "left",
                                        fontWeight: "600",
                                        color: "#1f2937",
                                      }}
                                    >
                                      Certificate Type
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
                                  {getFilteredRequestsPreview()
                                    .slice(0, 10)
                                    .map((req, idx) => (
                                      <tr
                                        key={req.id}
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
                                          {String(req.id).substring(0, 8)}...
                                        </td>
                                        <td
                                          style={{
                                            padding: "0.75rem",
                                            color: "#374151",
                                          }}
                                        >
                                          {req.certificate_type}
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
                                            {formatRequestStatus(
                                              req.request_status || req.status,
                                            )}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                              {getFilteredRequestsPreview().length > 10 && (
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
                                  {getFilteredRequestsPreview().length - 10}{" "}
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
                            Requests to assign:{" "}
                            <strong>{filteredUnassignedRequests.length}</strong>
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
                      {filteredUnassignedRequests.length} requests will be
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
                          {autoAssignResult.successCount} request
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
        selectedRequest &&
        createPortal(
          <div className="ar-modal modal-dialog request-detail-dialog">
            {/* Header */}
            <div className="ar-modal-header">
              <div className="ar-modal-header-top">
                <h3 className="ar-modal-title">{selectedRequest.title}</h3>
                <button className="ar-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>
              <div className="ar-modal-badges">
                <span
                  className="ar-status-badge-modal"
                  style={{
                    backgroundColor: getStatusColor(selectedRequest.status),
                    color: getStatusTextColor(selectedRequest.status),
                    borderColor: "rgba(0,0,0,0.10)",
                  }}
                >
                  {selectedRequest.status.toUpperCase()}
                </span>
                <span className="ar-admin-tag">System Admin View</span>
              </div>
            </div>

            {/* Body */}
            <div className="ar-modal-body">
              <div className="ar-metadata-grid">
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Citizen</label>
                  <p className="ar-metadata-value">
                    {selectedRequest.submittedBy}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Submitted</label>
                  <p className="ar-metadata-value">{selectedRequest.date}</p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Last Update</label>
                  <p className="ar-metadata-value">
                    {selectedRequest.lastUpdate}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Assigned Official</label>
                  <p className="ar-metadata-value ar-official-value">
                    {selectedRequest.assignedOfficial || "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Request Description</h4>
                <div className="ar-description-box">
                  {selectedRequest.description}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Official Response / Notes</h4>
                <div className="ar-response-box">
                  {selectedRequest.response}
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
                    onClick={handleTransferRequest}
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

              {/* History — reuses RequestDetail.css timeline classes */}
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
                      const statusLabel = formatRequestStatus(
                        h.request_status,
                      ).toUpperCase();
                      const dotColor = getRequestStatusColor(h.request_status);
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
