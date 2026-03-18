import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { insertRequest } from "../../supabse_db/request/request";
import { insertComplaint } from "../../supabse_db/complaint/complaint";
import { uploadAnImage } from "../../supabse_db/uploadImages";
import household_supabase from "../../supabse_db/household_supabase_client";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import "../../styles/UserPages.css";

const SubmitRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const { resident, userName } = useAuth();

  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserResidentId, setCurrentUserResidentId] = useState(null);
  const [respondentInput, setRespondentInput] = useState("");
  const [respondentSuggestions, setRespondentSuggestions] = useState([]);
  const [selectedRespondents, setSelectedRespondents] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const isCertificate = location.pathname.includes("certificate");
  const isComplaint = !isCertificate;

  const [formData, setFormData] = useState({
    complaintType: "",
    certificateType: "",
    incidentDate: "",
    incidentLocation: "",
    subject: "",
    description: "",
    attachments: [],
  });

  useEffect(() => {
    setCurrentUserResidentId(resident?.id || null);
  }, [resident]);

  // Cleanup timeout on unmount or when component changes
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleBack = () => navigate("/dashboard");
  const closeSidebar = () => setSidebarOpen(false);

  const searchResidents = async (query) => {
    if (!query || query.length < 2) {
      setRespondentSuggestions([]);
      return;
    }

    try {
      const { data, error } = await household_supabase
        .from("resident_fullnames_vw")
        .select("id, fullname")
        .ilike("fullname", `%${query}%`)
        .limit(20);

      if (error) {
        console.error("Search residents error:", error);
        return;
      }

      // Filter out current user and already selected respondents
      const selectedIds = selectedRespondents.map((r) => r.id);
      const filtered =
        data?.filter(
          (resident) =>
            resident.id !== currentUserResidentId &&
            !selectedIds.includes(resident.id),
        ) || [];

      console.log("resident_fullnames_vw Data:", data);
      console.log("Filtered Suggestions:", filtered);
      setRespondentSuggestions(filtered);
    } catch (error) {
      console.error("Error searching residents:", error);
    }
  };

  const handleRespondentInputChange = (e) => {
    const value = e.target.value;
    setRespondentInput(value);
    searchResidents(value);
  };

  const handleSelectRespondent = (respondent) => {
    setSelectedRespondents((prev) => [...prev, respondent]);
    setRespondentInput("");
    setRespondentSuggestions([]);
  };

  const handleRemoveRespondent = (index) => {
    setSelectedRespondents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // Validate respondents for complaint
    if (isComplaint && selectedRespondents.length === 0) {
      setSubmitError("Please add at least one respondent to the complaint.");
      return;
    }

    setSubmitLoading(true);

    try {
      let result;

      // 1. Create the complaint or request first
      if (isComplaint) {
        const respondentIds = selectedRespondents.map((r) => r.id);

        result = await insertComplaint(
          formData.complaintType,
          formData.incidentDate,
          formData.incidentLocation,
          formData.description,
          respondentIds.length > 0 ? respondentIds : null,
        );
      } else {
        result = await insertRequest(
          formData.subject,
          formData.description,
          formData.certificateType,
        );
      }

      if (!result.success) {
        setSubmitError(result.message || "Failed to submit. Please try again.");
        setSubmitLoading(false);
        return;
      }

      // 2. If successful and there are attachments, upload them
      if (formData.attachments.length > 0) {
        const recordId = result.data.id; // Get the ID of the newly created record
        const uploadType = isComplaint ? "complaint" : "request";

        // Upload each attachment to Supabase Storage
        const uploadPromises = formData.attachments.map((file) =>
          uploadAnImage(file, uploadType, recordId),
        );

        // Wait for all uploads to complete
        const uploadResults = await Promise.all(uploadPromises);

        // Check if any uploads failed (optional: log warnings)
        const failedUploads = uploadResults.filter((r) => !r.success);
        if (failedUploads.length > 0) {
          console.warn("Some files failed to upload:", failedUploads);
          // Note: The complaint/request is already created, so we proceed anyway
        }
      }

      // 3. Navigate to the appropriate page after successful submission
      setSubmitLoading(false);
      navigate(isComplaint ? "/complaints" : "/requests");
    } catch (error) {
      console.error("Error submitting:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
      setSubmitLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="user-landing-page">
      <div className="layout">
        {/* SIDEBAR COMPONENT */}
        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage=""
        />

        {/* MAIN CONTENT */}
        <main className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h3>
              {isCertificate ? "Certificate Request" : "File a Complaint"}
            </h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || "Loading..."}</strong>
                <span>Resident</span>
              </div>
              <button
                onClick={handleBack}
                className="back-button"
                title="Go back"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* FORM */}
          <div className="submit-request-container">
            <button onClick={handleBack} className="back-link" type="button">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>

            <div className="form-card">
              <div className="form-header">
                <div
                  className={`form-header-icon ${isCertificate ? "green" : "red"}`}
                >
                  {isCertificate ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="24"
                      height="24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <polyline points="9 15 11 17 15 13" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="24"
                      height="24"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="form-title">
                    {isCertificate ? "Certificate Request" : "File a Complaint"}
                  </h2>
                  <p className="form-subtitle">
                    {isCertificate
                      ? "Request official barangay certificates and documents"
                      : "Report incidents or issues in your barangay"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* ── COMPLAINT FIELDS ── */}
                {isComplaint && (
                  <>
                    <div className="form-group">
                      <label htmlFor="complaintType">
                        Complaint Type <span className="required-star">*</span>
                      </label>
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
                        <option value="Property Dispute">
                          Property Dispute
                        </option>
                        <option value="Public Disturbance">
                          Public Disturbance
                        </option>
                        <option value="Road/Infrastructure Issue">
                          Road/Infrastructure Issue
                        </option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="incidentDate">
                        Incident Date <span className="required-star">*</span>
                      </label>
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
                      <label htmlFor="incidentLocation">
                        Incident Location{" "}
                        <span className="required-star">*</span>
                      </label>
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
                      <label htmlFor="description">
                        Description <span className="required-star">*</span>
                      </label>
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
                      <label htmlFor="respondents">
                        Respondent(s) <span className="required-star">*</span>
                      </label>
                      <div
                        className="respondent-input-wrapper"
                        style={{ position: "relative" }}
                      >
                        <input
                          type="text"
                          id="respondents"
                          value={respondentInput}
                          onChange={handleRespondentInputChange}
                          placeholder="Search and add respondents (type at least 2 characters)..."
                          className="form-input"
                          required={selectedRespondents.length === 0}
                        />
                        {respondentSuggestions.length > 0 && (
                          <div
                            className="respondent-dropdown"
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "#fff",
                              border: "1px solid #ddd",
                              borderTop: "none",
                              borderRadius: "0 0 4px 4px",
                              maxHeight: "150px",
                              overflowY: "auto",
                              zIndex: 10,
                            }}
                          >
                            {respondentSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() =>
                                  handleSelectRespondent(suggestion)
                                }
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #eee",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.backgroundColor = "#f5f5f5")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.backgroundColor =
                                    "transparent")
                                }
                              >
                                {suggestion.fullname}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedRespondents.length > 0 && (
                        <div
                          className="selected-respondents"
                          style={{ marginTop: "10px" }}
                        >
                          {selectedRespondents.map((respondent, index) => (
                            <div
                              key={index}
                              className="respondent-tag"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                backgroundColor: "#e8f0ff",
                                border: "1px solid #b3d9ff",
                                borderRadius: "4px",
                                padding: "6px 10px",
                                marginRight: "6px",
                                marginBottom: "6px",
                                fontSize: "13px",
                              }}
                            >
                              <span style={{ marginRight: "6px" }}>
                                {respondent.fullname}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRespondent(index)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#d32f2f",
                                  cursor: "pointer",
                                  fontSize: "16px",
                                  padding: "0",
                                  lineHeight: "1",
                                }}
                                title="Remove respondent"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="attachment-hint">
                        Add one or more respondents involved in the complaint
                        (required)
                      </p>
                    </div>

                    <div className="form-group">
                      <label>Attachments (Evidence, Photos, etc.)</label>
                      <div className="attachments-area">
                        {formData.attachments.map((file, index) => (
                          <div key={index} className="attachment-item">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="attachment-name">{file.name}</span>
                            <button
                              type="button"
                              className="remove-attachment"
                              onClick={() => handleRemoveFile(index)}
                              title="Remove file"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="add-file-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="16 16 12 12 8 16" />
                            <line x1="12" y1="12" x2="12" y2="21" />
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                          </svg>
                          Add File
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                        />
                      </div>
                      <p className="attachment-hint">
                        Attach supporting evidence or photos of the incident
                        (optional)
                      </p>
                    </div>
                  </>
                )}

                {/* ── CERTIFICATE REQUEST FIELDS ── */}
                {isCertificate && (
                  <>
                    <div className="form-group">
                      <label htmlFor="certificateType">
                        Certificate Type{" "}
                        <span className="required-star">*</span>
                      </label>
                      <select
                        id="certificateType"
                        name="certificateType"
                        value={formData.certificateType}
                        onChange={handleChange}
                        className="form-select"
                        required
                      >
                        <option value="">Select certificate type</option>
                        <option value="Certificate of Indigency">
                          Certificate of Indigency
                        </option>
                        <option value="Barangay Clearance">
                          Barangay Clearance
                        </option>
                        <option value="Certificate of Residency">
                          Certificate of Residency
                        </option>
                        <option value="Business Permit">Business Permit</option>
                        <option value="Community Tax Certificate">
                          Community Tax Certificate
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="subject">
                        Subject <span className="required-star">*</span>
                      </label>
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
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="attachment-name">{file.name}</span>
                            <button
                              type="button"
                              className="remove-attachment"
                              onClick={() => handleRemoveFile(index)}
                              title="Remove file"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="add-file-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="16 16 12 12 8 16" />
                            <line x1="12" y1="12" x2="12" y2="21" />
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                          </svg>
                          Add File
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                        />
                      </div>
                      <p className="attachment-hint">
                        Please attach at least one valid ID or document
                      </p>
                    </div>
                  </>
                )}

                {submitError && (
                  <div
                    style={{
                      color: "#dc2626",
                      fontSize: "13px",
                      marginBottom: "8px",
                      textAlign: "center",
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="submit"
                    className={`btn-submit${isComplaint ? " btn-submit-red" : ""}`}
                    disabled={submitLoading}
                  >
                    {submitLoading
                      ? "Submitting..."
                      : isComplaint
                        ? "Submit Complaint"
                        : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-cancel"
                    disabled={submitLoading}
                  >
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
