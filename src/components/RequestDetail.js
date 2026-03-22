import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import ImageLightbox from "./ImageLightbox";
import { fetchImagesForItem } from "../supabse_db/uploadImages";
import { getRequestHistory } from "../supabse_db/request/request";
import { getComplaintHistory } from "../supabse_db/complaint/complaint";
import "../styles/RequestDetail.css";

const RequestDetail = ({
  request,
  itemType = "request",
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    status: "IN_PROGRESS",
    internalNotes: "",
  });

  const [images, setImages] = useState([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status || "IN_PROGRESS",
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

  const loadHistory = async () => {
    if (!request || !request.id) return;
    setHistoryLoading(true);
    try {
      const historyFn = itemType === "complaint" ? getComplaintHistory : getRequestHistory;
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

  const statusOptions = [
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "FOR_COMPLIANCE", label: "For Compliance" },
    { value: "NON_COMPLIANT", label: "Non Compliant" },
    { value: "FOR_VALIDATION", label: "For Validation" },
  ];

  // Status colors used for history badges
  const statusColorMap = {
    PENDING: "#F59E0B",
    IN_PROGRESS: "#0EA5E9",
    COMPLETED: "#10B981",
    REJECTED: "#EF4444",
    FOR_COMPLIANCE: "#8B5CF6",
    NON_COMPLIANT: "#EC4899",
    FOR_VALIDATION: "#06B6D4",
    RESIDENT_COMPLIED: "#14B8A6",
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ requestId: request.id, ...formData });
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !request) return null;

  const getStatusBadge = () => {
    const statusMap = {
      PENDING: { color: "#F59E0B", label: "PENDING" },
      IN_PROGRESS: { color: "#0EA5E9", label: "IN PROGRESS" },
      COMPLETED: { color: "#10B981", label: "COMPLETED" },
      REJECTED: { color: "#EF4444", label: "REJECTED" },
      FOR_COMPLIANCE: { color: "#8B5CF6", label: "FOR COMPLIANCE" },
      NON_COMPLIANT: { color: "#EC4899", label: "NON COMPLIANT" },
      FOR_VALIDATION: { color: "#06B6D4", label: "FOR VALIDATION" },
    };
    return statusMap[formData.status] || { color: "#6B7280", label: formData.status };
  };

  const statusBadge = getStatusBadge();

  const modalContent = (
    <>
      <div className="modal-overlay" onClick={handleOverlayClick}></div>

      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <span className="status-badge" style={{ backgroundColor: statusBadge.color }}>
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
              <div className="detail-value">
                <span className="avatar-icon">👤</span>
                <span>{request.submittedBy}</span>
              </div>
            </div>
            <div className="detail-section">
              <label className="detail-label">SUBMISSION DATE</label>
              <div className="detail-value">
                <span className="date-icon">📅</span>
                <span>{request.submissionDate}</span>
              </div>
            </div>
            {itemType === "complaint" && (request.respondents || request.respondent_id) && (
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
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Internal Notes / Official Response</label>
              <textarea
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Add your notes or response here..."
                rows="5"
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
                  const rawStatus = (h.request_status || "").toUpperCase().replace(/ /g, "_");
                  const statusLabel = h.request_status
                    ? h.request_status.replace(/_/g, " ").toUpperCase()
                    : "";
                  const dotColor = statusColorMap[rawStatus] || "#6B7280";

                  return (
                    <li key={idx} className="history-item" style={{ "--dot-color": dotColor }}>
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
        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
          <button className="btn-save" onClick={handleSave}>
            ✓ Save & Update Status
          </button>
        </div>
      </div>

      <ImageLightbox
        images={images}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );

  return createPortal(modalContent, document.body);
};

export default RequestDetail;