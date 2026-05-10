import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Image as ImageIcon, UserRound } from "lucide-react";
import ImageLightbox from "./ImageLightbox";
import { fetchImagesForItem } from "../supabse_db/uploadImages";
import { getRequestHistory } from "../supabse_db/request/request";
import { getComplaintHistory } from "../supabse_db/complaint/complaint";
import {
  formatResidentFullName,
  getResidentByAuthUid,
} from "../supabse_db/resident/resident";
import {
  REQUEST_STATUS_OPTIONS,
  formatRequestStatus,
  getRequestStatusColor,
  requestStatusCodeToValue,
  requestStatusValueToCode,
} from "../utils/requestStatuses";
import "../styles/RequestDetail.css";

const RequestDetail = ({
  request,
  itemType = "request",
  isOpen,
  onClose,
  onSave,
  onClaim,
  onUnclaim,
  currentUserId,
}) => {
  const [formData, setFormData] = useState({
    status: "PENDING",
    internalNotes: "",
  });

  const [images, setImages] = useState([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [claimingInProgress, setClaimingInProgress] = useState(false);
  const [residentInfoOpen, setResidentInfoOpen] = useState(false);
  const [residentInfo, setResidentInfo] = useState(null);
  const [residentInfoLoading, setResidentInfoLoading] = useState(false);
  const [residentInfoError, setResidentInfoError] = useState("");

  const isAssignedToMe = request?.assigned_official_id === currentUserId;
  const isUnassigned = !request?.assigned_official_id;
  const isAssignedToOther =
    request?.assigned_official_id &&
    request?.assigned_official_id !== currentUserId;
  const canEdit = isAssignedToMe;

  useEffect(() => {
    if (request) {
      setFormData({
        status:
          request.status ||
          requestStatusValueToCode(request.request_status || "pending"),
        internalNotes: request.internalNotes || "",
      });
      fetchImages();
    }
  }, [request, isOpen, itemType]);

  useEffect(() => {
    if (request && isOpen) {
      loadHistory();
    }
  }, [request, isOpen, itemType]);

  useEffect(() => {
    setResidentInfoOpen(false);
    setResidentInfo(null);
    setResidentInfoError("");
    setResidentInfoLoading(false);
  }, [request?.id, isOpen]);

  const loadHistory = async () => {
    if (!request || !request.id) return;
    setHistoryLoading(true);
    try {
      const historyFn =
        itemType === "complaint" ? getComplaintHistory : getRequestHistory;
      const result = await historyFn(request.id);
      if (result.success) {
        setHistory(result.data || []);
      } else {
        console.error("Failed to load history:", result.message);
        setHistory([]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const fetchImages = async () => {
    if (!request || !request.id) return;
    setImagesLoading(true);
    try {
      const result = await fetchImagesForItem(itemType, request.id);
      if (result.success) {
        setImages(result.images || []);
      } else {
        setImages([]);
      }
    } catch (error) {
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

  const statusOptions = REQUEST_STATUS_OPTIONS.map((option) => ({
    value: requestStatusValueToCode(option.value),
    label: option.label,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (shouldUnclaim = false) => {
    if (onSave) {
      onSave({ requestId: request.id, ...formData, shouldUnclaim });
    }
  };

  const handleClaim = async () => {
    if (!onClaim || claimingInProgress) return;
    setClaimingInProgress(true);
    try {
      await onClaim(request.id);
    } finally {
      setClaimingInProgress(false);
    }
  };

  const handleUnclaim = async () => {
    if (!onUnclaim || claimingInProgress) return;
    setClaimingInProgress(true);
    try {
      await onUnclaim(request.id);
    } finally {
      setClaimingInProgress(false);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatValue(value);
    return date.toLocaleDateString();
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatValue(value);
    return date.toLocaleString();
  };

  const buildResidentFieldSections = (resident) => {
    if (!resident) return [];

    return [
      {
        title: "Identity",
        fields: [
          ["Resident No.", resident.resident_no],
          ["Profile ID", resident.profile_id],
          ["Household ID", resident.household_id],
          ["Purok ID", resident.purok_id],
          ["Purok", resident.purok_name || resident.purok],
          ["First Name", resident.first_name],
          ["Middle Name", resident.middle_name],
          ["Last Name", resident.last_name],
          ["Suffix", resident.suffix],
          ["Date of Birth", formatDate(resident.date_of_birth)],
          ["Age", resident.age],
          ["Place of Birth", resident.place_of_birth],
          ["Sex", resident.sex],
          ["Civil Status", resident.civil_status],
          ["Nationality", resident.nationality],
          ["Religion", resident.religion],
          ["Occupation", resident.occupation],
        ],
      },
      {
        title: "Contact and Residence",
        fields: [
          ["Contact Number", resident.contact_number],
          ["Email", resident.email || resident.registered_email],
          ["Address", resident.address_line],
          ["Years of Stay", resident.years_of_stay],
          ["Voter Status", resident.voter_status],
        ],
      },
      {
        title: "Government and Health IDs",
        fields: [
          ["PhilHealth No.", resident.philhealth_no],
          ["SSS No.", resident.sss_no],
          ["TIN No.", resident.tin_no],
          ["Blood Type", resident.blood_type],
          ["Age Group", resident.age_group],
          ["ID Number", resident.id_number],
          ["Valid ID Type", resident.valid_id_type],
          ["Valid ID URL", resident.valid_id_url],
          ["Photo URL", resident.photo_url],
        ],
      },
      {
        title: "System Info",
        fields: [
          ["Auth UID", resident.auth_uid],
          ["Activated", resident.is_activated],
          ["Status", resident.status],
          ["Created At", formatDateTime(resident.created_at)],
          ["Updated At", formatDateTime(resident.updated_at)],
          ["Created By", resident.created_by],
        ],
      },
    ];
  };

  const handleViewResidentInfo = async () => {
    const requesterUid =
      request?.requester_id || request?.complainant_id || request?.auth_uid;

    setResidentInfoOpen(true);
    setResidentInfoError("");

    if (!requesterUid) {
      setResidentInfo(null);
      setResidentInfoError("Unable to identify this resident.");
      return;
    }

    if (residentInfo?.auth_uid === requesterUid) return;

    setResidentInfoLoading(true);
    try {
      const result = await getResidentByAuthUid(requesterUid, {
        forceRefresh: true,
      });

      if (!result.success) {
        setResidentInfo(null);
        setResidentInfoError(
          result.message || "Unable to load resident information.",
        );
        return;
      }

      if (!result.data) {
        setResidentInfo(null);
        setResidentInfoError("Resident information was not found.");
        return;
      }

      setResidentInfo(result.data);
    } catch (error) {
      setResidentInfo(null);
      setResidentInfoError(
        error.message || "Unable to load resident information.",
      );
    } finally {
      setResidentInfoLoading(false);
    }
  };

  const closeResidentInfo = () => {
    setResidentInfoOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !request) return null;

  const getStatusBadge = () => {
    const statusValue = requestStatusCodeToValue(formData.status);
    const label = formatRequestStatus(statusValue).toUpperCase();

    return {
      color: getRequestStatusColor(statusValue),
      label: label || String(formData.status || "UPDATED"),
    };
  };

  const statusBadge = getStatusBadge();

  const modalContent = (
    <>
      <div
        className="modal-overlay request-detail-overlay"
        onClick={handleOverlayClick}
      ></div>

      <div
        className="modal-dialog request-detail-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <span
              className="status-badge"
              style={{ backgroundColor: statusBadge.color }}
            >
              {statusBadge.label}
            </span>
            <span className="request-id">ID: #{request.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <h2 className="request-title">{request.title}</h2>

          {/* Details Grid */}
          <div className="details-grid">
            <div className="detail-section">
              <label className="detail-label">CITIZEN NAME</label>
              <div className="detail-value citizen-detail-value">
                <span className="avatar-icon">👤</span>
                <span>{request.submittedBy}</span>
                {itemType === "request" && (
                  <button
                    type="button"
                    className="resident-info-button"
                    onClick={handleViewResidentInfo}
                  >
                    <UserRound size={14} />
                    View Information
                  </button>
                )}
              </div>
            </div>

            <div className="detail-section">
              <label className="detail-label">SUBMISSION DATE</label>
              <div className="detail-value">
                <span className="date-icon">📅</span>
                <span>{request.submissionDate}</span>
              </div>
            </div>

            <div className="detail-section">
              <label className="detail-label">ASSIGNED OFFICIAL</label>
              <div className="detail-value">
                <span className="avatar-icon">👮</span>
                <span
                  style={{
                    color: isUnassigned
                      ? "#ef4444"
                      : isAssignedToMe
                        ? "#10b981"
                        : "#f59e0b",
                    fontWeight: "600",
                  }}
                >
                  {isUnassigned
                    ? "Unassigned"
                    : request.assigned_official_name || "Unknown Official"}
                </span>
              </div>
            </div>

            {/* ── Certificate Type (requests only) ── */}
            {itemType === "request" && request.type && (
              <div className="detail-section">
                <label className="detail-label">CERTIFICATE TYPE</label>
                <div className="detail-value">
                  <span className="cert-icon">📄</span>
                  <span>{request.type}</span>
                </div>
              </div>
            )}

            {/* ── Complaint Type (complaints only) ── */}
            {itemType === "complaint" && request.title && (
              <div className="detail-section">
                <label className="detail-label">COMPLAINT TYPE</label>
                <div className="detail-value">
                  <span className="cert-icon">📋</span>
                  <span>{request.title}</span>
                </div>
              </div>
            )}

            {/* ── Respondent(s) (complaints only) ── */}
            {itemType === "complaint" &&
              (request.respondents || request.respondent_id) && (
                <div className="detail-section">
                  <label className="detail-label">RESPONDENT(S)</label>
                  <div className="detail-value">
                    <span className="respondent-icon">👥</span>
                    <span>
                      {request.respondents
                        ? request.respondents
                        : Array.isArray(request.respondent_id)
                          ? request.respondent_id.join(", ")
                          : request.respondent_id || "—"}
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* Description */}
          <div className="description-section">
            <label className="detail-label">DESCRIPTION</label>
            <p className="description-text">"{request.description}"</p>
          </div>

          {isAssignedToOther && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>⚠️</span>
              <span style={{ color: "#92400e", fontWeight: "500" }}>
                This request is assigned to another official. You cannot edit
                it.
              </span>
            </div>
          )}

          {/* Images */}
          <div className="images-section">
            <div className="images-header">
              <ImageIcon size={20} />
              <label className="detail-label">ATTACHED IMAGES</label>
            </div>
            {imagesLoading ? (
              <p className="images-loading">Loading images...</p>
            ) : images.length > 0 ? (
              <div className="images-gallery">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className="image-thumbnail-btn"
                    onClick={() => setIsLightboxOpen(true)}
                    title="Click to view"
                  >
                    <img src={image.url} alt={`Attachment ${index + 1}`} />
                    <div className="image-overlay">
                      <span className="view-text">View</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="no-images">No images are attached</p>
            )}
          </div>

          {/* Update Progress */}
          <div className="update-progress-section">
            <div className="update-progress-header">
              <FileText size={20} />
              <h3>Update Progress</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-select"
                disabled={!canEdit}
                style={{
                  cursor: !canEdit ? "not-allowed" : "pointer",
                  opacity: !canEdit ? 0.6 : 1,
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Internal Notes / Official Response
              </label>
              <textarea
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder={
                  canEdit
                    ? "Add your notes or response here..."
                    : "You cannot edit this request"
                }
                rows="5"
                disabled={!canEdit}
                style={{
                  cursor: !canEdit ? "not-allowed" : "text",
                  opacity: !canEdit ? 0.6 : 1,
                }}
              ></textarea>
            </div>
          </div>

          {/* History Timeline */}
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
                    h.status || h.complaint_status || h.request_status || "";
                  const statusLabel = formatRequestStatus(statusValue)
                    ? formatRequestStatus(statusValue).toUpperCase()
                    : "UPDATED";
                  const dotColor = getRequestStatusColor(statusValue);

                  return (
                    <li
                      key={idx}
                      className="history-item"
                      style={{ "--history-dot-color": dotColor }}
                    >
                      {/* Timeline dot — required for the vertical line + circle */}
                      <div className="history-dot" />

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
        <div className="modal-footer" style={{ display: "flex", flexDirection: "row", gap: "0.75rem" }}>
          {isUnassigned && onClaim && (
            <>
              <button className="btn-close" onClick={onClose} style={{ flex: "1" }}>
                Close
              </button>
              <button
                className="btn-save"
                onClick={handleClaim}
                disabled={claimingInProgress}
                style={{
                  flex: "1",
                  backgroundColor: claimingInProgress ? "#94a3b8" : "#10b981",
                  cursor: claimingInProgress ? "not-allowed" : "pointer",
                }}
              >
                {claimingInProgress ? "Claiming..." : "✓ Claim This Item"}
              </button>
            </>
          )}
          {isAssignedToMe && (
            <>
              <button 
                className="btn-close" 
                onClick={onClose}
                style={{ flex: "1" }}
              >
                Close
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={claimingInProgress}
                style={{
                  flex: "1",
                  padding: "0.75rem 1rem",
                  backgroundColor: claimingInProgress ? "#94a3b8" : "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: claimingInProgress ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!claimingInProgress) {
                    e.currentTarget.style.backgroundColor = "#dc2626";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!claimingInProgress) {
                    e.currentTarget.style.backgroundColor = "#ef4444";
                  }
                }}
              >
                {claimingInProgress ? "Saving..." : "Save & Unclaim"}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={claimingInProgress}
                style={{
                  flex: "1",
                  padding: "0.75rem 1rem",
                  backgroundColor: claimingInProgress ? "#94a3b8" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: claimingInProgress ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!claimingInProgress) {
                    e.currentTarget.style.backgroundColor = "#059669";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!claimingInProgress) {
                    e.currentTarget.style.backgroundColor = "#10b981";
                  }
                }}
              >
                {claimingInProgress ? "Saving..." : "✓ Save & Keep Claim"}
              </button>
            </>
          )}
          {!isAssignedToMe && !isUnassigned && (
            <button className="btn-close" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <ImageLightbox
        images={images}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />

      {residentInfoOpen && (
        <>
          <div
            className="resident-info-overlay"
            onClick={closeResidentInfo}
          ></div>
          <div
            className="resident-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="resident-info-header">
              <div>
                <span className="resident-info-kicker">Resident Details</span>
                <h3 id="resident-info-title">
                  {residentInfo
                    ? formatResidentFullName(residentInfo) ||
                      request.submittedBy
                    : request.submittedBy}
                </h3>
              </div>
              <button
                type="button"
                className="resident-info-close"
                onClick={closeResidentInfo}
                aria-label="Close resident information"
              >
                <X size={18} />
              </button>
            </div>

            <div className="resident-info-body">
              {residentInfoLoading ? (
                <p className="resident-info-note">Loading resident details...</p>
              ) : residentInfoError ? (
                <p className="resident-info-error">{residentInfoError}</p>
              ) : residentInfo ? (
                <>
                  <div className="resident-info-summary">
                    <div className="resident-info-avatar">
                      {residentInfo.photo_url ? (
                        <img
                          src={residentInfo.photo_url}
                          alt={formatResidentFullName(residentInfo)}
                        />
                      ) : (
                        <UserRound size={28} />
                      )}
                    </div>
                    <div>
                      <strong>
                        {formatResidentFullName(residentInfo) ||
                          request.submittedBy}
                      </strong>
                      <span>
                        {formatValue(residentInfo.sex)} - Age{" "}
                        {formatValue(residentInfo.age)}
                      </span>
                      <span>{formatValue(residentInfo.address_line)}</span>
                    </div>
                  </div>

                  <div className="resident-info-sections">
                    {buildResidentFieldSections(residentInfo).map((section) => (
                      <section
                        className="resident-info-section"
                        key={section.title}
                      >
                        <h4>{section.title}</h4>
                        <div className="resident-info-fields">
                          {section.fields.map(([label, value]) => (
                            <div className="resident-info-field" key={label}>
                              <span>{label}</span>
                              <strong>{formatValue(value)}</strong>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <p className="resident-info-note">
                  No resident information available.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
};

export default RequestDetail;
