import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { insertRequest } from '../supabse_db/request/request';
import { insertComplaint } from '../supabse_db/complaint/complaint';
import { uploadAnImage } from '../supabse_db/uploadImages';
import supabase from '../supabse_db/supabase_client';
import './userlanding.css';

const SubmitRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [userName, setUserName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isCertificate = location.pathname.includes('certificate');
  const isComplaint = !isCertificate;

  const [formData, setFormData] = useState({
    complaintType: '',
    certificateType: '',
    incidentDate: '',
    incidentLocation: '',
    subject: '',
    description: '',
    attachments: []
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: memberData } = await supabase
          .from('sample_household_members_tbl')
          .select('firstname, lastname, middlename')
          .eq('auth_uid', userData.user.id)
          .single();

        if (memberData) {
          const fullName = [memberData.firstname, memberData.middlename, memberData.lastname]
            .filter(Boolean)
            .join(' ');
          setUserName(fullName);
        }
      }
    };
    fetchUser();
  }, []);

  const handleBack = () => navigate('/dashboard');
  const closeSidebar = () => setSidebarOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitLoading(true);

    try {
      let result;

      // 1. Create the complaint or request first
      if (isComplaint) {
        result = await insertComplaint(
          formData.complaintType,
          formData.incidentDate,
          formData.incidentLocation,
          formData.description
        );
      } else {
        result = await insertRequest(
          formData.subject,
          formData.description,
          formData.certificateType
        );
      }

      if (!result.success) {
        setSubmitError(result.message || 'Failed to submit. Please try again.');
        setSubmitLoading(false);
        return;
      }

      // 2. If successful and there are attachments, upload them
      if (formData.attachments.length > 0) {
        const recordId = result.data.id; // Get the ID of the newly created record
        const uploadType = isComplaint ? 'complaint' : 'request';

        // Upload each attachment to Supabase Storage
        const uploadPromises = formData.attachments.map(file => 
          uploadAnImage(file, uploadType, recordId)
        );

        // Wait for all uploads to complete
        const uploadResults = await Promise.all(uploadPromises);

        // Check if any uploads failed (optional: log warnings)
        const failedUploads = uploadResults.filter(r => !r.success);
        if (failedUploads.length > 0) {
          console.warn('Some files failed to upload:', failedUploads);
          // Note: The complaint/request is already created, so we proceed anyway
        }
      }

      // 3. Navigate to the appropriate page after successful submission
      setSubmitLoading(false);
      navigate(isComplaint ? '/complaints' : '/requests');

    } catch (error) {
      console.error('Error submitting:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      setSubmitLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="user-landing-page">
      <div className="layout">

        {/* MOBILE SIDEBAR OVERLAY */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
          onClick={closeSidebar}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <button className="sidebar-close" onClick={closeSidebar} aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

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
            <a href="/dashboard" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9"/>
                <path d="M9 21V9h6v12"/>
              </svg>
              Dashboard
            </a>
            <h4>SERVICES</h4>
            <a href="/requests" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/>
                <path d="M8 2v4M16 2v4M4 10h16"/>
              </svg>
              My Requests
            </a>
            <a href="/complaints" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              My Complaints
            </a>
            <a href="/announcements" onClick={closeSidebar}>
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
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h3>{isCertificate ? 'Certificate Request' : 'File a Complaint'}</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || 'Loading...'}</strong>
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

              <div className="form-header">
                <div className={`form-header-icon ${isCertificate ? 'green' : 'red'}`}>
                  {isCertificate ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <polyline points="9 15 11 17 15 13"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="form-title">
                    {isCertificate ? 'Certificate Request' : 'File a Complaint'}
                  </h2>
                  <p className="form-subtitle">
                    {isCertificate
                      ? 'Request official barangay certificates and documents'
                      : 'Report incidents or issues in your barangay'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>

                {/* ── COMPLAINT FIELDS ── */}
                {isComplaint && (
                  <>
                    <div className="form-group">
                      <label htmlFor="complaintType">Complaint Type <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label htmlFor="incidentDate">Incident Date <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label htmlFor="incidentLocation">Incident Location <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label htmlFor="description">Description <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label>
                        Attachments (Evidence, Photos, etc.)
                      </label>
                      <div className="attachments-area">
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

                        <button
                          type="button"
                          className="add-file-btn"
                          onClick={() => fileInputRef.current?.click()}
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
                      <p className="attachment-hint">Attach supporting evidence or photos of the incident (optional)</p>
                    </div>
                  </>
                )}

                {/* ── CERTIFICATE REQUEST FIELDS ── */}
                {isCertificate && (
                  <>
                    <div className="form-group">
                      <label htmlFor="certificateType">Certificate Type <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label htmlFor="subject">Subject <span className="required-star">*</span></label>
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

                    <div className="form-group">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide additional details about your request (optional)..."
                        className="form-textarea"
                        rows="5"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        Attachments (Valid ID, etc.)
                        <span className="required-star"> *</span>
                      </label>
                      <div className="attachments-area">
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

                        <button
                          type="button"
                          className="add-file-btn"
                          onClick={() => fileInputRef.current?.click()}
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

                {submitError && (
                  <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>
                    {submitError}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className={`btn-submit${isComplaint ? ' btn-submit-red' : ''}`}
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Submitting...' : isComplaint ? 'Submit Complaint' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={handleBack} className="btn-cancel" disabled={submitLoading}>
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