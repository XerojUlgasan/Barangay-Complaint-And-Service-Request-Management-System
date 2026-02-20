import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import '../styles/RequestDetail.css';

/**
 * RequestDetail Modal Component
 * 
 * This component displays a modal dialog showing detailed information about a service request.
 * Features:
 * - Displays request information (citizen name, submission date, description)
 * - Allows official to update request status with dropdown
 * - Provides textarea for internal notes and official responses
 * - Save and Update functionality
 * - Close modal on completion
 * 
 * Props:
 * @param {object} request - Request object containing:
 *   - id: Request ID
 *   - title: Request title
 *   - type: Type of request
 *   - status: Current status
 *   - submittedBy: Who submitted the request
 *   - submissionDate: When request was submitted
 *   - description: Request description
 *   - internalNotes: Current internal notes (if any)
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {function} onSave - Callback when save button is clicked
 */
const RequestDetail = ({ request, isOpen, onClose, onSave }) => {
  // State for form fields that can be edited
  const [formData, setFormData] = useState({
    status: 'IN_PROGRESS',
    internalNotes: '',
  });

  // Update formData when request prop changes
  useEffect(() => {
    if (request) {
      setFormData({
        status: request.status || 'IN_PROGRESS',
        internalNotes: request.internalNotes || '',
      });
    }
  }, [request, isOpen]);

  // Available status options for dropdown
  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  /**
   * Update form field when user types
   * @param {object} e - Event object from input/textarea
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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
      PENDING: { color: '#FDB750', label: 'PENDING' },
      IN_PROGRESS: { color: '#4A90E2', label: 'IN PROGRESS' },
      COMPLETED: { color: '#50C878', label: 'COMPLETED' },
      REJECTED: { color: '#EF4444', label: 'REJECTED' },
    };
    return statusMap[formData.status] || { color: '#6B7280', label: formData.status };
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
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Internal Notes / Official Response Textarea */}
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
    </>
  );

  return createPortal(modalContent, document.body);
};

export default RequestDetail;
