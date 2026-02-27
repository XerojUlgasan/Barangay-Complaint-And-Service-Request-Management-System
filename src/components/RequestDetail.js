import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Image as ImageIcon } from "lucide-react";
import ImageLightbox from "./ImageLightbox";
import { fetchImagesForItem } from "../supabse_db/uploadImages";
import { getRequestHistory } from "../supabse_db/request/request";
import { getComplaintHistory } from "../supabse_db/complaint/complaint";
import "../styles/RequestDetail.css";

/**
 * RequestDetail Modal Component
 *
 * This component displays a modal dialog showing detailed information about a service request or complaint.
 * Features:
 * - Displays request information (citizen name, submission date, description)
 * - Displays attached images in a lightbox gallery
 * - Allows official to update request status with dropdown
 * - Provides textarea for internal notes and official responses
 * - Save and Update functionality
 * - Close modal on completion
 *
 * Props:
 * @param {object} request - Request object containing:
 *   - id: Request ID
 *   - title: Request title
 *   - status: Current status
 *   - submittedBy: Who submitted the request
 *   - submissionDate: When request was submitted
 *   - description: Request description
 *   - internalNotes: Current internal notes (if any)
 * @param {string} itemType - Type of item: 'request' or 'complaint'
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {function} onSave - Callback when save button is clicked
 */
const RequestDetail = ({
  request,
  itemType = "request",
  isOpen,
  onClose,
  onSave,
}) => {
  // State for form fields that can be edited
  const [formData, setFormData] = useState({
    status: "IN_PROGRESS",
    internalNotes: "",
  });

  // State for images
  const [images, setImages] = useState([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  // State for history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Update formData when request prop changes
  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status || "IN_PROGRESS",
        internalNotes: request.internalNotes || "",
      });

      // Fetch images when modal opens
      fetchImages();
    }
  }, [request, isOpen, itemType]);

  // fetch history when request changes or modal opens
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

  // Fetch images from Supabase Storage
  const fetchImages = async () => {
    if (!request || !request.id) return;

    setImagesLoading(true);
    try {
      const result = await fetchImagesForItem(itemType, request.id);
      if (result.success) {
        setImages(result.images || []);
        console.log(
          `Fetched ${result.count} images for ${itemType} ${request.id}`,
        );
      } else {
        console.error("Error fetching images:", result.error);
        setImages([]);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

  // Available status options for dropdown
  const statusOptions = [
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "FOR_COMPLIANCE", label: "For Compliance" },
    { value: "NON_COMPLIANT", label: "Non Compliant" },
    { value: "FOR_VALIDATION", label: "For Validation" },
  ];

  /**
   * Update form field when user types
   * @param {object} e - Event object from input/textarea
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle save button click
   *
   * This function:
   * 1. Calls the onSave callback with updated form data
   * 2. Includes request ID for database update
   * 3. Closes the modal after saving
   *
   * TODO: Implement API call to update request in Supabase
   * const updateRequest = async (requestId, updates) => {
   *   const { data, error } = await supabase
   *     .from('requests')
   *     .update({ status: updates.status, internal_notes: updates.internalNotes })
   *     .eq('id', requestId);
   * }
   */
  const handleSave = () => {
    if (onSave) {
      onSave({
        requestId: request.id,
        ...formData,
      });
    }
    onClose();
  };

  // Handle overlay click - close modal when clicking outside
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render if modal is not open
  if (!isOpen || !request) return null;

  /**
   * Get status badge color based on current status
   * @returns {object} Object with color and label
   */
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
    return (
      statusMap[formData.status] || { color: "#6B7280", label: formData.status }
    );
  };

  const statusBadge = getStatusBadge();

  const modalContent = (
    <>
      {/* Modal Overlay - semi-transparent background */}
      <div className="modal-overlay" onClick={handleOverlayClick}></div>

      {/* Modal Dialog - main content area */}
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with status badge and ID */}
        <div className="modal-header">
          <div className="modal-header-content">
            {/* Status badge */}
            <span
              className="status-badge"
              style={{ backgroundColor: statusBadge.color }}
            >
              {statusBadge.label}
            </span>
            {/* Request ID */}
            <span className="request-id">ID: #{request.id}</span>
          </div>
          {/* Close button */}
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Modal Body - scrollable content */}
        <div className="modal-body">
          {/* Request Title */}
          <h2 className="request-title">{request.title}</h2>

          {/* Request Details Grid */}
          <div className="details-grid">
            {/* Citizen Name Section */}
            <div className="detail-section">
              <label className="detail-label">CITIZEN NAME</label>
              <div className="detail-value">
                {/* User avatar icon */}
                <span className="avatar-icon">👤</span>
                <span>{request.submittedBy}</span>
              </div>
            </div>

            {/* Submission Date Section */}
            <div className="detail-section">
              <label className="detail-label">SUBMISSION DATE</label>
              <div className="detail-value">
                {/* Calendar icon */}
                <span className="date-icon">📅</span>
                <span>{request.submissionDate}</span>
              </div>
            </div>
          </div>

          {/* Request Description */}
          <div className="description-section">
            <label className="detail-label">DESCRIPTION</label>
            {/* Description text in italic */}
            <p className="description-text">"{request.description}"</p>
          </div>

          {/* Attached Images Section */}
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

          {/* UPDATE PROGRESS Section - form for official to update status */}
          <div className="update-progress-section">
            <div className="update-progress-header">
              <FileText size={20} />
              <h3>Update Progress</h3>
            </div>

            {/* Status Update Dropdown */}
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

            {/* Internal Notes / Official Response Textarea */}
            <div className="form-group">
              <label className="form-label">
                Internal Notes / Official Response
              </label>
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

          {/* HISTORY SECTION - displays previous status updates */}
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
                  const statusLabel = h.request_status
                    ? h.request_status.replace(/_/g, " ").toUpperCase()
                    : "";
                  return (
                    <li key={idx} className="history-item">
                      <div className="history-row">
                        <span className="history-date">
                          {date.toLocaleString()}
                        </span>
                        <span className="history-status">
                          {statusLabel}
                        </span>
                        <span className="history-user">
                          {h.updater_name || "System"}
                        </span>
                      </div>
                      {h.remarks && (
                        <div className="history-remarks">
                          {h.remarks}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="no-history">No history available.</p>
            )}
          </div>
        </div>

        {/* Modal Footer - action buttons */}
        <div className="modal-footer">
          {/* Close button */}
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
          {/* Save and Update button - primary action */}
          <button className="btn-save" onClick={handleSave}>
            ✓ Save & Update Status
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
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
