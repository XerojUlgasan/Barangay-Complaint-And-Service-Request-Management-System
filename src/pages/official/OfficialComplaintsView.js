import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { CalendarDays, FileText, MapPin, Tag, Users, X } from "lucide-react";
import {
  getAssignedComplaints,
  updateComplaintCategory,
} from "../../supabse_db/official/official";
import { claimComplaint, unclaimComplaint } from "../../supabse_db/complaint/complaint";
import { fetchImagesForItem } from "../../supabse_db/uploadImages";
import {
  formatPhilippineDateOnly,
  formatPhilippineDateTime,
} from "../../utils/philippineTime";
import ImageLightbox from "../../components/ImageLightbox";
import supabase from "../../supabse_db/supabase_client";
import "../../styles/BarangayAdmin.css";

const SECTION_CONFIGS = [
  {
    key: "all",
    label: "All",
    description: "All complaints across all categories.",
  },
  {
    key: "uncategorized",
    label: "Uncategorized",
    description: "Complaints without a category. Only these can be classified.",
  },
  {
    key: "community concern",
    label: "Community Concern",
    description: "Complaints categorized as community concerns.",
  },
  {
    key: "barangay complaint",
    label: "Barangay Complaint",
    description: "Complaints categorized as barangay complaints.",
  },
  {
    key: "community dispute",
    label: "Community Dispute",
    description: "Complaints categorized as community disputes.",
  },
  {
    key: "personal complaint",
    label: "Personal Complaint",
    description: "Complaints categorized as personal complaints.",
  },
];

const STATUS_CONFIGS = {
  "for review": { label: "For Review", color: "#f59e0b" },
  pending: { label: "Pending", color: "#f97316" },
  recorded: { label: "Recorded", color: "#0ea5e9" },
  rejected: { label: "Rejected", color: "#ef4444" },
  resolved: { label: "Resolved", color: "#10b981" },
};

const STATUS_FILTER_OPTIONS = [
  "All Status",
  "For Review",
  "Pending",
  "Recorded",
  "Rejected",
  "Resolved",
];

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const titleCase = (value) =>
  String(value || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDate = (value, includeTime = false) => {
  if (includeTime) {
    return formatPhilippineDateTime(value, "N/A");
  }

  return formatPhilippineDateOnly(value, "N/A");
};

const getStatusConfig = (status) => {
  const key = normalizeKey(status);
  return (
    STATUS_CONFIGS[key] || {
      label: titleCase(status || "For Review"),
      color: "#6b7280",
    }
  );
};

const getSectionKey = (category) => normalizeKey(category) || "uncategorized";

const getSectionLabel = (sectionKey) =>
  SECTION_CONFIGS.find((section) => section.key === sectionKey)?.label ||
  titleCase(sectionKey);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ComplaintDetailModal = ({
  complaint,
  isOpen,
  onClose,
  onSetCategory,
  isUpdatingCategory,
  images = [],
  imagesLoading = false,
  onImageClick = null,
  onClaim = null,
  onUnclaim = null,
  currentUserId = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [claimingInProgress, setClaimingInProgress] = useState(false);

  const isAssignedToMe = complaint?.assigned_official_id === currentUserId;
  const isUnassigned = !complaint?.assigned_official_id;
  const isAssignedToOther = complaint?.assigned_official_id && complaint?.assigned_official_id !== currentUserId;
  const canEdit = isAssignedToMe;

  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setShowConfirmation(false);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !complaint) return null;

  const isUncategorized = complaint.sectionKey === "uncategorized";
  const statusConfig = getStatusConfig(complaint.status);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowConfirmation(true);
  };

  const handleConfirmCategory = async () => {
    if (!selectedCategory) return;

    setShowConfirmation(false);
    const result = await onSetCategory(selectedCategory);

    if (!result?.success) return;

    setSuccessMessage(
      `Category set to "${titleCase(selectedCategory)}" and status set to "Recorded".`,
    );

    setTimeout(() => {
      setSuccessMessage(null);
      setSelectedCategory(null);
      onClose();
    }, 1200);
  };

  const handleClaim = async () => {
    if (!onClaim || claimingInProgress) return;
    setClaimingInProgress(true);
    try {
      await onClaim(complaint.id);
    } finally {
      setClaimingInProgress(false);
    }
  };

  const handleUnclaim = async () => {
    if (!onUnclaim || claimingInProgress) return;
    setClaimingInProgress(true);
    try {
      await onUnclaim(complaint.id);
    } finally {
      setClaimingInProgress(false);
    }
  };

  const CATEGORY_OPTIONS = [
    "community concern",
    "barangay complaint",
    "community dispute",
    "personal complaint",
  ];

  return createPortal(
    <>
      <div className="complaint-detail-overlay" onClick={onClose} />
      <div
        className="complaint-detail-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="complaint-detail-header">
          <div className="complaint-detail-header-content">
            <span
              className="complaint-status-badge"
              style={{ backgroundColor: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            <span className="complaint-section-pill">
              {getSectionLabel(complaint.sectionKey)}
            </span>
          </div>
          <button className="complaint-detail-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="complaint-detail-body">
          <div className="complaint-detail-title-wrap">
            <h2 className="complaint-detail-title">
              {complaint.complaintType}
            </h2>
            <p className="complaint-detail-subtitle">
              Submitted on {complaint.submittedAt}
            </p>
          </div>

          <div className="complaint-detail-grid">
            <div className="complaint-detail-card">
              <label>Creation Date</label>
              <div>
                <CalendarDays size={16} />
                <span>{complaint.submittedAt}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Incident Date</label>
              <div>
                <CalendarDays size={16} />
                <span>{complaint.incidentDate}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Incident Location</label>
              <div>
                <MapPin size={16} />
                <span>{complaint.incidentLocation}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Complainant</label>
              <div>
                <Users size={16} />
                <span>{complaint.complainant}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Complaint Type</label>
              <div>
                <FileText size={16} />
                <span>{complaint.complaintType}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Respondent(s)</label>
              <div>
                <Users size={16} />
                <span>{complaint.respondentDisplay}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Assigned Official</label>
              <div>
                <Users size={16} />
                <span style={{ 
                  color: isUnassigned ? "#ef4444" : isAssignedToMe ? "#10b981" : "#f59e0b",
                  fontWeight: "600"
                }}>
                  {isUnassigned ? "Unassigned" : complaint.assigned_official_name || "Unknown Official"}
                </span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Category</label>
              <div>
                <Tag size={16} />
                <span>{getSectionLabel(complaint.sectionKey)}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Status</label>
              <div>
                <Tag size={16} />
                <span>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          <div className="complaint-description-section">
            <label>Description</label>
            <p>{complaint.description}</p>
          </div>

          {isAssignedToOther && (
            <div style={{
              padding: "1rem",
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{ fontSize: "1.25rem" }}>⚠️</span>
              <span style={{ color: "#92400e", fontWeight: "500" }}>
                This complaint is assigned to another official. You cannot edit it.
              </span>
            </div>
          )}

          {complaint.remarks ? (
            <div className="complaint-description-section complaint-notes-section">
              <label>Remarks</label>
              <p>{complaint.remarks}</p>
            </div>
          ) : null}

          {imagesLoading ? (
            <div className="complaint-images-section">
              <label>Evidence Photos</label>
              <p style={{ color: "#6b7280", fontSize: "13px" }}>
                Loading images...
              </p>
            </div>
          ) : images.length > 0 ? (
            <div className="complaint-images-section">
              <label>Evidence Photos ({images.length})</label>
              <div className="complaint-images-grid">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="complaint-image-thumbnail"
                    onClick={() => onImageClick && onImageClick()}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      onError={(e) => {
                        e.target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImage Error%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="complaint-image-overlay">
                      <span>View</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="complaint-detail-footer">
          <button className="complaint-detail-secondary" onClick={onClose}>
            Close
          </button>
          {successMessage && (
            <div
              style={{
                color: "#10b981",
                fontSize: "14px",
                fontWeight: "500",
                marginLeft: "auto",
              }}
            >
              ✓ {successMessage}
            </div>
          )}
          {isUnassigned && onClaim && !successMessage && (
            <button
              className="complaint-detail-action"
              onClick={handleClaim}
              disabled={claimingInProgress}
              style={{
                marginLeft: "auto",
                backgroundColor: claimingInProgress ? "#94a3b8" : "#10b981",
                cursor: claimingInProgress ? "not-allowed" : "pointer",
              }}
            >
              {claimingInProgress ? "Claiming..." : "✓ Claim This Complaint"}
            </button>
          )}
          {isAssignedToMe && (
            <>
              {onUnclaim && (
                <button
                  className="complaint-detail-secondary"
                  onClick={handleUnclaim}
                  disabled={claimingInProgress}
                  style={{
                    marginLeft: "auto",
                    backgroundColor: claimingInProgress ? "#94a3b8" : "#ef4444",
                    color: "#fff",
                    cursor: claimingInProgress ? "not-allowed" : "pointer",
                  }}
                >
                  {claimingInProgress ? "Unclaiming..." : "Unclaim"}
                </button>
              )}
              {isUncategorized && (
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <select
                    className="filter-date-input"
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={isUpdatingCategory}
                    style={{ minWidth: "200px" }}
                  >
                    <option value="">Select Category</option>
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {titleCase(category)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="complaint-detail-action"
                    onClick={() => handleCategorySelect(selectedCategory)}
                    disabled={!selectedCategory || isUpdatingCategory}
                  >
                    Set Category
                  </button>
                </div>
              )}
            </>
          )}
          {isAssignedToOther && (
            <div style={{
              marginLeft: "auto",
              color: "#64748b",
              fontSize: "14px",
              fontStyle: "italic",
            }}>
              Assigned to another official
            </div>
          )}
        </div>

        {showConfirmation && selectedCategory && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            onClick={() => setShowConfirmation(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                maxWidth: "400px",
                textAlign: "center",
                zIndex: 10001,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: "12px", marginTop: 0 }}>
                Confirm Category
              </h3>
              <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                Categorize this complaint as:
              </p>
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  fontWeight: "500",
                }}
              >
                {titleCase(selectedCategory)}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                <button
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#e5e7eb",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  onClick={() => {
                    setShowConfirmation(false);
                    setSelectedCategory(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  onClick={handleConfirmCategory}
                  disabled={isUpdatingCategory}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
};

export default function OfficialComplaintsView() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("uncategorized");
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState("All Status");
  const [complaintImages, setComplaintImages] = useState([]);
  const [complaintImagesLoading, setComplaintImagesLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [claimFilter, setClaimFilter] = useState("all");

  const searchTerms = useMemo(
    () =>
      Array.from(
        new Set(searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)),
      ),
    [searchQuery],
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

  const getCurrentUser = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setCurrentUserId(userData.user.id);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setErrorComplaints(null);

      const result = await getAssignedComplaints();

      if (!result.success || !Array.isArray(result.data)) {
        setComplaints([]);
        setErrorComplaints(result.message || "Failed to fetch complaints");
        return;
      }

      const transformed = result.data.map((row) => {
        const status = row.status || "for review";
        const sectionKey = getSectionKey(row.category);
        const respondentDisplay =
          row.respondent_names ||
          (Array.isArray(row.respondent_id)
            ? row.respondent_id.join(", ")
            : "") ||
          "—";

        return {
          ...row,
          complaintType: row.complaint_type || "Untitled Complaint",
          incidentLocation: row.incident_location || "Unknown Location",
          incidentDate: formatDate(row.incident_date),
          submittedAt: formatDate(row.created_at, true),
          complainant: row.complainant_name || "Unknown",
          respondentDisplay,
          status,
          statusDisplay: getStatusConfig(status).label,
          statusColor: getStatusConfig(status).color,
          sectionKey,
          sectionLabel: getSectionLabel(sectionKey),
          description: row.description || "No description provided",
          remarks: row.remarks || "",
          assigned_official_id: row.assigned_official_id || null,
          assigned_official_name: row.assigned_official_name || null,
        };
      });

      setComplaints(transformed);
    } catch (error) {
      setComplaints([]);
      setErrorComplaints("Error fetching complaints: " + error.message);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    getCurrentUser();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
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

  useEffect(() => {
    if (
      location.state?.selectedComplaintId &&
      location.state?.openModal &&
      complaints.length > 0
    ) {
      const complaint = complaints.find(
        (row) => String(row.id) === String(location.state.selectedComplaintId),
      );

      if (complaint) {
        setSelectedComplaint(complaint);
        setIsModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [complaints, location.state]);

  const sectionCounts = useMemo(() => {
    return SECTION_CONFIGS.reduce((accumulator, section) => {
      accumulator[section.key] =
        section.key === "all"
          ? complaints.length
          : complaints.filter(
              (complaint) => complaint.sectionKey === section.key,
            ).length;
      return accumulator;
    }, {});
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return complaints.filter((complaint) => {
      const sectionMatch =
        activeSection === "all" || complaint.sectionKey === activeSection;
      const searchableColumns = [
        complaint.complaintType,
        complaint.incidentLocation,
        complaint.respondentDisplay,
        complaint.incidentDate,
        complaint.submittedAt,
        complaint.statusDisplay,
        complaint.complainant,
        complaint.description,
        complaint.sectionLabel,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch =
        searchTerms.length === 0 ||
        searchTerms.every((term) => searchableColumns.includes(term));

      const complaintDate = complaint.created_at
        ? new Date(complaint.created_at)
        : null;
      const statusMatch =
        activeStatusFilter === "All Status" ||
        normalizeKey(complaint.statusDisplay) ===
          normalizeKey(activeStatusFilter);
      const dateMatch =
        (!start || !complaintDate || complaintDate >= start) &&
        (!end || !complaintDate || complaintDate <= end);

      let claimMatch = true;
      if (claimFilter === "mine") {
        claimMatch = complaint.assigned_official_id === currentUserId;
      } else if (claimFilter === "others") {
        claimMatch = complaint.assigned_official_id && complaint.assigned_official_id !== currentUserId;
      } else if (claimFilter === "unclaimed") {
        claimMatch = !complaint.assigned_official_id;
      }

      return sectionMatch && searchMatch && statusMatch && dateMatch && claimMatch;
    });
  }, [
    activeSection,
    activeStatusFilter,
    complaints,
    endDate,
    searchTerms,
    startDate,
    claimFilter,
    currentUserId,
  ]);

  const openModal = async (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
    setComplaintImagesLoading(true);
    setComplaintImages([]);

    const imagesResult = await fetchImagesForItem("complaint", complaint.id);
    if (imagesResult.success) {
      setComplaintImages(imagesResult.images || []);
    }
    setComplaintImagesLoading(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setComplaintImages([]);
    setLightboxOpen(false);
    setTimeout(() => setSelectedComplaint(null), 250);
  };

  const handleSetCategory = async (category) => {
    if (!selectedComplaint || isUpdatingCategory) return;

    try {
      setIsUpdatingCategory(true);
      const result = await updateComplaintCategory(
        selectedComplaint.id,
        category,
      );

      if (!result.success) {
        setErrorComplaints(
          result.message || "Failed to update complaint category",
        );
        return { success: false, message: result.message };
      }

      await fetchComplaints();
      return { success: true };
    } catch (error) {
      setErrorComplaints("Error updating complaint category: " + error.message);
      return { success: false, message: error.message };
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleClaimComplaint = async (complaintId) => {
    const result = await claimComplaint(complaintId);
    if (result.success) {
      await fetchComplaints();
      closeModal();
    }
  };

  const handleUnclaimComplaint = async (complaintId) => {
    const result = await unclaimComplaint(complaintId);
    if (result.success) {
      await fetchComplaints();
      closeModal();
    }
  };

  const activeSectionConfig =
    SECTION_CONFIGS.find((section) => section.key === activeSection) ||
    SECTION_CONFIGS[0];

  return (
    <div className={`admin-page${isModalOpen ? " modal-open-blur" : ""}`}>
      <div className="ar-page-content official-complaints-page">
        <div className="page-actions official-complaints-header">
          <div>
            <h3>Official Complaints</h3>
            <p className="muted">
              Review assigned complaints by category and classify uncategorized
              cases.
            </p>
          </div>
          <div className="complaints-header-note">
            Only uncategorized complaints can be moved to community concern,
            barangay complaint, community dispute, or personal complaint.
          </div>
        </div>

        <div className="table-filters official-complaints-filters">
          <div className="filter-search">
            <label className="filter-label">Search</label>
            <input
              type="text"
              placeholder="Search by type, location, complainant, respondent, or description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-dates">
            <div>
              <label className="filter-label">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={
                  new Date(
                    new Date().getTime() -
                      new Date().getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .split("T")[0]
                }
                className="filter-date-input"
              />
            </div>
            <div>
              <label className="filter-label">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                max={
                  new Date(
                    new Date().getTime() -
                      new Date().getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .split("T")[0]
                }
                className="filter-date-input"
              />
            </div>
            {(startDate ||
              endDate ||
              searchQuery ||
              activeStatusFilter !== "All Status") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                  setActiveStatusFilter("All Status");
                }}
                className="filter-clear-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="complaint-section-tabs">
          {SECTION_CONFIGS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`complaint-section-tab${activeSection === section.key ? " active" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              <span>{section.label}</span>
              <span className="complaint-section-count">
                {sectionCounts[section.key] || 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setClaimFilter("all")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: claimFilter === "all" ? "#3b82f6" : "#fff",
              color: claimFilter === "all" ? "#fff" : "#374151",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            onClick={() => setClaimFilter("mine")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: claimFilter === "mine" ? "#10b981" : "#fff",
              color: claimFilter === "mine" ? "#fff" : "#374151",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            My Claims
          </button>
          <button
            onClick={() => setClaimFilter("others")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: claimFilter === "others" ? "#f59e0b" : "#fff",
              color: claimFilter === "others" ? "#fff" : "#374151",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Claimed by Others
          </button>
          <button
            onClick={() => setClaimFilter("unclaimed")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: claimFilter === "unclaimed" ? "#ef4444" : "#fff",
              color: claimFilter === "unclaimed" ? "#fff" : "#374151",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Unclaimed
          </button>
        </div>

        <div className="complaint-section-summary">
          <div>
            <strong>{activeSectionConfig.label}</strong>
            <span>{activeSectionConfig.description}</span>
          </div>
          <div className="official-section-summary-right">
            <select
              className="filter-date-input official-status-filter-select"
              value={activeStatusFilter}
              onChange={(event) => setActiveStatusFilter(event.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            <div className="table-count-label">
              Showing {filteredComplaints.length} of{" "}
              {sectionCounts[activeSection] || 0} complaints
            </div>
          </div>
        </div>

        <div className="requests-table-card">
          <table className="requests-table balanced-table complaint-table">
            <thead>
              <tr>
                <th>Complaint Type</th>
                <th>Category</th>
                <th>Respondent(s)</th>
                <th>Incident Date</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingComplaints ? (
                <tr>
                  <td colSpan="7">
                    <div className="loading-wrap" style={{ padding: "1rem 0" }}>
                      <div className="loading-spinner" aria-hidden="true" />
                      <div className="loading-text">Loading complaints...</div>
                    </div>
                  </td>
                </tr>
              ) : errorComplaints ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ color: "#ef4444", textAlign: "center" }}
                  >
                    {errorComplaints}
                  </td>
                </tr>
              ) : filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>
                      <div className="complaint-table-main">
                        <span className="req-title">
                          {highlightText(complaint.complaintType)}
                        </span>
                        <span className="complaint-table-subtitle">
                          {highlightText(complaint.incidentLocation)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="req-submitted">
                        {highlightText(complaint.sectionLabel)}
                      </span>
                    </td>
                    <td>
                      <span className="req-submitted complaint-table-respondents">
                        {highlightText(complaint.respondentDisplay)}
                      </span>
                    </td>
                    <td>
                      <span className="req-submitted">
                        {highlightText(complaint.incidentDate)}
                      </span>
                    </td>
                    <td>
                      <span className="req-submitted">
                        {highlightText(complaint.submittedAt)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="req-status-badge"
                        style={{ backgroundColor: complaint.statusColor }}
                      >
                        {highlightText(complaint.statusDisplay)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="view-details-btn"
                        onClick={() => openModal(complaint)}
                      >
                        {complaint.sectionKey === "uncategorized"
                          ? "View & Classify"
                          : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="table-empty-cell">
                    No complaints found in this section
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSetCategory={handleSetCategory}
        isUpdatingCategory={isUpdatingCategory}
        images={complaintImages}
        imagesLoading={complaintImagesLoading}
        onImageClick={() => setLightboxOpen(true)}
        onClaim={handleClaimComplaint}
        onUnclaim={handleUnclaimComplaint}
        currentUserId={currentUserId}
      />

      <ImageLightbox
        images={complaintImages}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
