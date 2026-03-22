import React, { useState, useEffect } from "react";
import { ChevronDown, User, Calendar, Clock, ArrowRight } from "lucide-react";
import { getAssignedComplaints } from "../../supabse_db/official/official";
import { updateComplaintStatus } from "../../supabse_db/official/official";
import { fetchImagesForItem } from "../../supabse_db/uploadImages";
import RequestDetail from "../../components/RequestDetail";
import "../../styles/Requests.css";

export default function OfficialComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedComplaints();
  }, []);

  // Blur the page content behind the modal when it opens
  useEffect(() => {
    const pageContent = document.querySelector('.requests-container');
    if (!pageContent) return;

    if (isDetailModalOpen) {
      pageContent.classList.add('modal-open-blur');
    } else {
      pageContent.classList.remove('modal-open-blur');
    }

    return () => {
      pageContent.classList.remove('modal-open-blur');
    };
  }, [isDetailModalOpen]);

  // Blur the page content behind the modal when it opens
  useEffect(() => {
    const pageContent = document.querySelector('.requests-container');
    if (!pageContent) return;

    if (isDetailModalOpen) {
      pageContent.classList.add('modal-open-blur');
    } else {
      pageContent.classList.remove('modal-open-blur');
    }

    return () => {
      pageContent.classList.remove('modal-open-blur');
    };
  }, [isDetailModalOpen]);

  const fetchAssignedComplaints = async () => {
    try {
      const result = await getAssignedComplaints();
      console.log("Raw result from getAssignedComplaints:", result);

      // Handle error responses from database function
      if (!result.success) {
        console.error("Failed to fetch complaints:", result.message);
        setLoading(false);
        return;
      }

      // Unwrap data from successful response
      const data = result.data || [];
      console.log("Fetched complaints:", data);

      // Add additional fields for UI
      const complaintsWithUI = data.map((complaint) => ({
        ...complaint,
        id: complaint.id,
        title: complaint.complaint_type || "Complaint",
        submittedBy: complaint.complainant_name || "Unknown",
        respondents: complaint.respondent_names || "",
        submissionDate: complaint.created_at
          ? new Date(complaint.created_at).toLocaleDateString()
          : "N/A",
        updatedDate: complaint.updated_at
          ? new Date(complaint.updated_at).toLocaleDateString()
          : "N/A",
        type: complaint.complaint_type,
        status: complaint.status || "pending",
        statusColor: getStatusColorForUI(complaint.status),
        borderColor: getBorderColorForUI(complaint.status),
      }));

      setComplaints(complaintsWithUI);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching assigned complaints:", error);
      setLoading(false);
    }
  };

  const getStatusColorForUI = (status) => {
    const colorMap = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#EF4444",
      for_compliance: "#8B5CF6",
      non_compliant: "#EC4899",
      for_validation: "#06B6D4",
    };
    return colorMap[status] || "#6B7280";
  };

  const getBorderColorForUI = (status) => {
    const borderMap = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#DC2626",
      for_compliance: "#7C3AED",
      non_compliant: "#DB2777",
      for_validation: "#0891B2",
    };
    return borderMap[status] || "#6B7280";
  };

  const filterOptions = [
    "All Status",
    "Pending",
    "In Progress",
    "Completed",
    "Rejected",
    "For Compliance",
    "Non Compliant",
    "For Validation",
  ];

  const handleFilterChange = (option) => {
    setFilterStatus(option);
    setIsFilterOpen(false);
  };

  const getFilteredComplaints = () => {
    if (filterStatus === "All Status") {
      return complaints;
    }

    const statusMap = {
      "In Progress": "in_progress",
      Completed: "completed",
      Pending: "pending",
      Rejected: "rejected",
      "For Compliance": "for_compliance",
      "Non Compliant": "non_compliant",
      "For Validation": "for_validation",
    };

    const dbStatus = statusMap[filterStatus];
    console.log("Filtering by status:", filterStatus, "-> DB status:", dbStatus);
    console.log(
      "All complaints with status values:",
      complaints.map((c) => ({ id: c.id, status: c.status })),
    );

    const filtered = complaints.filter(
      (complaint) => complaint.status.toLowerCase() === dbStatus,
    );
    console.log("Filtered results:", filtered.length);

    return filtered;
  };

  const handleViewDetails = (complaintId) => {
    const complaint = complaints.find((c) => c.id === complaintId);
    if (complaint) {
      setSelectedComplaint(complaint);
      setIsDetailModalOpen(true);
      setIsFilterOpen(false);
    }
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedComplaint(null);
  };

  const handleSaveComplaint = async (updatedData) => {
    try {
      const statusMap = {
        PENDING: "pending",
        IN_PROGRESS: "in_progress",
        COMPLETED: "completed",
        REJECTED: "rejected",
        FOR_COMPLIANCE: "for_compliance",
        NON_COMPLIANT: "non_compliant",
        FOR_VALIDATION: "for_validation",
      };

      const dbStatus =
        statusMap[updatedData.status] || updatedData.status.toLowerCase();

      const result = await updateComplaintStatus(
        selectedComplaint.id,
        dbStatus,
        updatedData.remarks,
        updatedData.priority_level,
      );

      if (result.success) {
        console.log("Complaint updated successfully");
        fetchAssignedComplaints();
        handleCloseModal();
      } else {
        console.error("Failed to update complaint:", result.message);
      }
    } catch (error) {
      console.error("Error saving complaint:", error);
    }
  };

  const getStatusBadge = (status) => {
    const lowercaseStatus =
      typeof status === "string" ? status.toLowerCase() : status;
    const statusMap = {
      pending: { label: "PENDING", color: "#F59E0B" },
      in_progress: { label: "IN PROGRESS", color: "#0EA5E9" },
      completed: { label: "COMPLETED", color: "#10B981" },
      rejected: { label: "REJECTED", color: "#EF4444" },
      for_compliance: { label: "FOR COMPLIANCE", color: "#8B5CF6" },
      non_compliant: { label: "NON COMPLIANT", color: "#EC4899" },
      for_validation: { label: "FOR VALIDATION", color: "#06B6D4" },
    };
    return (
      statusMap[lowercaseStatus] || {
        label: typeof status === "string" ? status.toUpperCase() : status,
        color: "#6B7280",
      }
    );
  };

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h1 className="requests-title">Assigned Complaints</h1>
        <p className="requests-subtitle">
          Review and manage citizen complaints
        </p>
      </div>

      <div className="filter-section">
        <div className="filter-dropdown">
          <button
            className="filter-button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 5H17M5 10H15M7 15H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>{filterStatus}</span>
            <ChevronDown
              size={20}
              className={`chevron ${isFilterOpen ? "open" : ""}`}
            />
          </button>

          {isFilterOpen && (
            <div className="filter-menu">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  className={`filter-item ${filterStatus === option ? "active" : ""}`}
                  onClick={() => handleFilterChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {isFilterOpen && (
          <div
            className="filter-overlay"
            onClick={() => setIsFilterOpen(false)}
          />
        )}
      </div>

      <div className="requests-list">
        {loading ? (
          <div className="empty-state">
            <div className="loading-wrap">
              <div className="loading-spinner" aria-hidden="true"></div>
              <div className="loading-text">Loading complaints...</div>
            </div>
          </div>
        ) : getFilteredComplaints().length > 0 ? (
          getFilteredComplaints().map((complaint) => {
            const statusBadge = getStatusBadge(complaint.status);
            return (
              <div
                key={complaint.id}
                className="request-card"
                style={{ borderLeft: `4px solid ${complaint.borderColor}` }}
              >
                <div className="request-badge">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusBadge.color }}
                  >
                    {statusBadge.label}
                  </span>
                  <span className="type-badge">{complaint.type}</span>
                </div>

                <h3 className="request-title">{complaint.title}</h3>

                <div className="request-metadata">
                  <div className="metadata-item">
                    <User size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Complainant</span>
                      <span className="metadata-value">
                        {complaint.submittedBy}
                      </span>
                    </div>
                  </div>

                  <div className="metadata-item">
                    <Calendar size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Incident Date</span>
                      <span className="metadata-value">
                        {complaint.submissionDate}
                      </span>
                    </div>
                  </div>

                  <div className="metadata-item">
                    <Clock size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Last Updated</span>
                      <span className="metadata-value">
                        {complaint.updatedDate}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="view-details-btn"
                  onClick={() => handleViewDetails(complaint.id)}
                >
                  View Details
                  <ArrowRight size={18} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>No complaints found</p>
          </div>
        )}
      </div>

      <RequestDetail
        request={selectedComplaint}
        itemType="complaint"
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveComplaint}
      />
    </div>
  );
}