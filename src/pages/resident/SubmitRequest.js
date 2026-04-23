import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { insertRequest } from "../../supabse_db/request/request";
import { insertComplaint } from "../../supabse_db/complaint/complaint";
import { uploadAnImage } from "../../supabse_db/uploadImages";
import { getCertificateChoices } from "../../supabse_db/certificate/certificate";
import household_supabase from "../../supabse_db/household_supabase_client";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import "../../styles/UserPages.css";
import supabase from "../../supabse_db/supabase_client";

const COMPLAINT_TYPE_OPTIONS = [
  "Family & Domestic Disputes",
  "Property & Boundary Disputes",
  "Financial / Debt Issues",
  "Physical Injury / Altercation",
  "Public Disturbance / Nuisance",
  "Defamation (Slander / Libel)",
  "Trespassing",
  "Community Rule Violations",
  "Pet / Animal Complaints",
  "Minor Civil Disputes",
  "Others",
];

const SubmitRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const { authUser, resident, userName } = useAuth();

  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserResidentId, setCurrentUserResidentId] = useState(null);
  const [respondentInput, setRespondentInput] = useState("");
  const [respondentSuggestions, setRespondentSuggestions] = useState([]);
  const [selectedRespondents, setSelectedRespondents] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [respondentSearchLoading, setRespondentSearchLoading] = useState(false);
  const [certificateChoices, setCertificateChoices] = useState([]);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateChoiceError, setCertificateChoiceError] = useState("");
  const [certificateRequirementFiles, setCertificateRequirementFiles] =
    useState([]);

  const isCertificate = location.pathname.includes("certificate");
  const isComplaint = !isCertificate;

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    complaintType: "",
    otherComplaintType: "",
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

  useEffect(() => {
    if (!isCertificate) {
      setCertificateChoices([]);
      setCertificateChoiceError("");
      setCertificateRequirementFiles([]);
      return;
    }

    const loadCertificateChoices = async () => {
      setCertificateLoading(true);
      setCertificateChoiceError("");

      try {
        const result = await getCertificateChoices();
        if (result.success && Array.isArray(result.data)) {
          setCertificateChoices(result.data);
        } else {
          setCertificateChoices([]);
          setCertificateChoiceError(
            result.message || "Failed to load certificate choices",
          );
        }
      } catch (error) {
        setCertificateChoices([]);
        setCertificateChoiceError(
          error.message || "Failed to load certificate choices",
        );
      } finally {
        setCertificateLoading(false);
      }
    };

    loadCertificateChoices();
  }, [isCertificate]);

  const selectedCertificate = certificateChoices.find(
    (item) => item.type === formData.certificateType,
  );

  useEffect(() => {
    if (!isCertificate) return;

    const requirements = Array.isArray(selectedCertificate?.requirements)
      ? selectedCertificate.requirements
      : [];

    setCertificateRequirementFiles(
      requirements.map((requirement) => ({
        requirement,
        file: null,
      })),
    );
  }, [isCertificate, formData.certificateType, selectedCertificate]);

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
      setRespondentSearchLoading(true);
      const { data, error } = await supabase
        .from("residents_summary")
        .select("id, auth_uid, resident_fullname")
        .ilike("resident_fullname", `%${query}%`)
        .limit(20);

      if (error) {
        console.error("Search residents error:", error);
        setRespondentSuggestions([]);
        return;
      }

      // Filter out current user and already selected respondents
      const selectedAuthUids = selectedRespondents.map((r) => r.id);
      const filtered =
        data?.filter(
          (resident) =>
            resident.auth_uid &&
            resident.auth_uid !== authUser?.id &&
            resident.id !== currentUserResidentId &&
            !selectedAuthUids.includes(resident.auth_uid),
        ) || [];

      const normalized = filtered.map((resident) => ({
        id: resident.auth_uid,
        residentId: resident.id,
        fullname: resident.resident_fullname,
      }));

      console.log("residents_summary Data:", data);
      console.log("Filtered Suggestions:", filtered);
      setRespondentSuggestions(normalized);
    } catch (error) {
      console.error("Error searching residents:", error);
      setRespondentSuggestions([]);
    } finally {
      setRespondentSearchLoading(false);
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

    if (
      isComplaint &&
      formData.complaintType === "Others" &&
      !formData.otherComplaintType.trim()
    ) {
      setSubmitError("Please specify the complaint type.");
      return;
    }

    if (isComplaint && formData.incidentDate) {
      const selected = new Date(formData.incidentDate);
      const now = new Date();
      if (!Number.isNaN(selected.getTime()) && selected > now) {
        setSubmitError("Incident date and time cannot be in the future.");
        return;
      }
    }

    if (isCertificate) {
      const certificateValidationError = validateCertificateFiles();
      if (certificateValidationError) {
        setSubmitError(certificateValidationError);
        return;
      }
    }

    // Validate respondents for complaint - removed validation
    // if (isComplaint && selectedRespondents.length === 0) {
    //   setSubmitError("Please add at least one respondent to the complaint.");
    //   return;
    // }

    setSubmitLoading(true);

    try {
      let result;

      // 1. Create the complaint or request first
      if (isComplaint) {
        const respondentIds = selectedRespondents.map((r) => r.id);
        const normalizedComplaintType =
          formData.complaintType === "Others"
            ? `Others: ${formData.otherComplaintType.trim()}`
            : formData.complaintType;

        result = await insertComplaint(
          normalizedComplaintType,
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

      // 2. If successful, upload the supporting files
      if (isCertificate) {
        const recordId = result.data.id;
        const uploadResults = await Promise.all(
          certificateRequirementFiles.map((item, index) => {
            const renamedFile = new File(
              [item.file],
              buildRequirementFileName(item.requirement, item.file, index),
              {
                type: item.file.type,
                lastModified: item.file.lastModified,
              },
            );

            return uploadAnImage(renamedFile, "request", recordId);
          }),
        );

        const failedUploads = uploadResults.filter(
          (uploadResult) => !uploadResult.success,
        );
        if (failedUploads.length > 0) {
          console.warn(
            "Some requirement files failed to upload:",
            failedUploads,
          );
        }
      } else if (formData.attachments.length > 0) {
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "complaintType" && value !== "Others"
        ? { otherComplaintType: "" }
        : {}),
    }));
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

  const handleCertificateRequirementFileChange = (index, file) => {
    setCertificateRequirementFiles((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, file } : item,
      ),
    );
  };

  const isAllowedImageFile = (file) =>
    file && ["image/png", "image/jpeg"].includes(file.type);

  const validateCertificateFiles = () => {
    if (!selectedCertificate) {
      return "Please select a certificate type.";
    }

    if (
      !Array.isArray(selectedCertificate.requirements) ||
      selectedCertificate.requirements.length === 0
    ) {
      return "This certificate does not have any requirements configured.";
    }

    for (const requirementItem of certificateRequirementFiles) {
      if (!requirementItem.file) {
        return `Please upload ${requirementItem.requirement}.`;
      }

      if (!isAllowedImageFile(requirementItem.file)) {
        return `${requirementItem.requirement} must be a PNG or JPEG image.`;
      }
    }

    return "";
  };

  const buildRequirementFileName = (requirement, originalFile, index) => {
    const safeRequirement = String(requirement || "requirement")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const ext =
      originalFile.type === "image/png"
        ? "png"
        : originalFile.type === "image/jpeg"
          ? "jpg"
          : (originalFile.name.split(".").pop() || "jpg").toLowerCase();

    return `${safeRequirement || "requirement"}_${index + 1}.${ext}`;
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
              <ResidentProfile />
              <ResidentSettings />
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
                        {COMPLAINT_TYPE_OPTIONS.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.complaintType === "Others" && (
                      <div className="form-group">
                        <label htmlFor="otherComplaintType">
                          Please specify{" "}
                          <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          id="otherComplaintType"
                          name="otherComplaintType"
                          value={formData.otherComplaintType}
                          onChange={handleChange}
                          placeholder="Enter the specific complaint type"
                          className="form-input"
                          required
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="incidentDate">
                        Incident Date <span className="required-star">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="incidentDate"
                        name="incidentDate"
                        value={formData.incidentDate}
                        onChange={handleChange}
                        max={getCurrentDateTimeLocal()}
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
                      <label htmlFor="respondents">Respondent(s)</label>
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
                        />
                        {(respondentInput.trim().length >= 2 ||
                          respondentSearchLoading) && (
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
                            {respondentSearchLoading ? (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  color: "#6b7280",
                                }}
                              >
                                Searching residents...
                              </div>
                            ) : respondentSuggestions.length > 0 ? (
                              respondentSuggestions.map((suggestion) => (
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
                                    (e.currentTarget.style.backgroundColor =
                                      "#f5f5f5")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  {suggestion.fullname}
                                </div>
                              ))
                            ) : (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  color: "#6b7280",
                                }}
                              >
                                No matching residents found.
                              </div>
                            )}
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
                        (optional)
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
                        disabled={certificateLoading}
                      >
                        <option value="">
                          {certificateLoading
                            ? "Loading certificate types..."
                            : "Select certificate type"}
                        </option>
                        {certificateChoices.map((certificate) => (
                          <option key={certificate.id} value={certificate.type}>
                            {certificate.type}
                          </option>
                        ))}
                      </select>
                      {certificateChoiceError && (
                        <p
                          className="attachment-hint"
                          style={{ color: "#dc2626" }}
                        >
                          {certificateChoiceError}
                        </p>
                      )}
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

                    {selectedCertificate && (
                      <div className="form-group">
                        <label>
                          Requirements <span className="required-star">*</span>
                        </label>
                        <div style={{ display: "grid", gap: "0.9rem" }}>
                          {certificateRequirementFiles.map((item, index) => (
                            <div
                              key={`${item.requirement}-${index}`}
                              style={{
                                padding: "0.9rem",
                                border: "1px solid #dbe3ef",
                                borderRadius: "0.75rem",
                                background: "#f8fafc",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "0.75rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  marginBottom: "0.7rem",
                                }}
                              >
                                <strong style={{ color: "#0f172a" }}>
                                  {item.requirement}
                                </strong>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: isAllowedImageFile(item.file)
                                      ? "#047857"
                                      : "#b45309",
                                  }}
                                >
                                  {item.file
                                    ? item.file.name
                                    : "PNG or JPEG required"}
                                </span>
                              </div>

                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(e) =>
                                  handleCertificateRequirementFileChange(
                                    index,
                                    e.target.files?.[0] || null,
                                  )
                                }
                                className="form-input"
                                required
                              />
                            </div>
                          ))}
                        </div>
                        <p className="attachment-hint">
                          Each requirement must be completed with a PNG or JPEG
                          file before submission.
                        </p>
                      </div>
                    )}
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
