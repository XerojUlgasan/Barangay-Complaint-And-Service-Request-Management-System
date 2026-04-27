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
