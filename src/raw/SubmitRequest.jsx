import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './userlanding.css';

const SubmitRequest = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    requestType: 'Complaint',
    complaintType: '',
    certificateType: '',
    incidentDate: '',
    incidentLocation: '',
    subject: '',
    description: '',
    attachments: []
  });

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleAddFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const isComplaint = formData.requestType === 'Complaint';
  const isCertificate = formData.requestType === 'Certificate Request';

  return (
    <div className="user-landing-page">
      <div className="layout">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" className="shield-logo">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h2>BARANGAYLINK</h2>
              <p>Resident Services Registry</p>
            </div>
          </div>

          <div className="menu">
            <h4>GENERAL</h4>
            <a href="/dashboard">
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9"/>
                <path d="M9 21V9h6v12"/>
              </svg>
              Dashboard
            </a>

            <h4>SERVICES</h4>
            <a href="/requests">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/>
                <path d="M8 2v4M16 2v4M4 10h16"/>
              </svg>
              My Requests
            </a>
            <a href="/announcements">
              <svg viewBox="0 0 24 24">
                <path d="M3 11l18-5v10l-18-5v4"/>
              </svg>
              Announcements
            </a>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <h3>Submit Request</h3>
            <div className="user">
              <div className="user-text">
                <strong>Juan Dela Cruz</strong>
                <span>Resident</span>
              </div>
              <button onClick={handleBack} className="back-button" title="Go back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
            </div>
          </div>

          {/* FORM */}
          <div className="submit-request-container">
            <button onClick={handleBack} className="back-link" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Dashboard
            </button>

            <div className="form-card">
              <h2 className="form-title">Submit New Request</h2>

              <form onSubmit={handleSubmit}>

                {/* Request Type */}
                <div className="form-group">
                  <label htmlFor="requestType">Request Type</label>
                  <select
                    id="requestType"
                    name="requestType"
                    value={formData.requestType}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="Complaint">Complaint</option>
                    <option value="Certificate Request">Certificate Request</option>
                  </select>
                </div>

                {/* COMPLAINT FIELDS */}
                {isComplaint && (
                  <>
                    {/* Complaint Type */}
                    <div className="form-group">
                      <label htmlFor="complaintType">Complaint Type</label>
                      <select
                        id="complaintType"
                        name="complaintType"
                        value={formData.complaintType}
                        onChange={handleChange}
                        className="form-select"
                        required
                      >
                        <option value="">Select complaint type</option>
                        <option value="Noise Complaint">Noise Complaint</option>
                        <option value="Illegal Dumping">Illegal Dumping</option>
                        <option value="Property Dispute">Property Dispute</option>
                        <option value="Public Disturbance">Public Disturbance</option>
                        <option value="Road/Infrastructure Issue">Road/Infrastructure Issue</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Incident Date */}
                    <div className="form-group">
                      <label htmlFor="incidentDate">Incident Date</label>
                      <input
                        type="date"
                        id="incidentDate"
                        name="incidentDate"
                        value={formData.incidentDate}
                        onChange={handleChange}
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Incident Location */}
                    <div className="form-group">
                      <label htmlFor="incidentLocation">Incident Location</label>
                      <input
                        type="text"
                        id="incidentLocation"
                        name="incidentLocation"
                        value={formData.incidentLocation}
                        onChange={handleChange}
                        placeholder="Where did the incident occur?"
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Subject */}
                    <div className="form-group">
                      <label htmlFor="subject">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief subject for your complaint"
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide detailed information about the incident..."
                        className="form-textarea"
                        rows="6"
                        required
                      />
                    </div>
                  </>
                )}

                {/* CERTIFICATE REQUEST FIELDS */}
                {isCertificate && (
                  <>
                    {/* Certificate Type */}
                    <div className="form-group">
                      <label htmlFor="certificateType">Certificate Type</label>
                      <select
                        id="certificateType"
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleChange}
                        className="form-select"
                        required
                      >
                        <option value="">Select certificate type</option>
                        <option value="Certificate of Indigency">Certificate of Indigency</option>
                        <option value="Barangay Clearance">Barangay Clearance</option>
                        <option value="Certificate of Residency">Certificate of Residency</option>
                        <option value="Business Permit">Business Permit</option>
                        <option value="Community Tax Certificate">Community Tax Certificate</option>
                      </select>
                    </div>

                    {/* Subject */}
                    <div className="form-group">
                      <label htmlFor="subject">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief subject for your request"
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide detailed information about your request..."
                        className="form-textarea"
                        rows="6"
                      />
                    </div>

                    {/* Attachments */}
                    <div className="form-group">
                      <label>
                        Attachments (Valid ID, etc.)
                        <span className="required-star"> *</span>
                      </label>

                      <div className="attachments-area">
                        {/* Uploaded files */}
                        {formData.attachments.map((file, index) => (
                          <div key={index} className="attachment-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span className="attachment-name">{file.name}</span>
                            <button
                              type="button"
                              className="remove-attachment"
                              onClick={() => handleRemoveFile(index)}
                              title="Remove file"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ))}

                        {/* Add File button */}
                        <button
                          type="button"
                          className="add-file-btn"
                          onClick={handleAddFileClick}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 16 12 12 8 16"/>
                            <line x1="12" y1="12" x2="12" y2="21"/>
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                          </svg>
                          Add File
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>

                      <p className="attachment-hint">Please attach at least one valid ID or document</p>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    Submit Request
                  </button>
                  <button type="button" onClick={handleCancel} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default SubmitRequest;