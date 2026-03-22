import React, { useState, useEffect } from "react";
import { ChevronDown, Calendar, User, Clock, ArrowRight } from "lucide-react";
import RequestDetail from "../../components/RequestDetail";
import {
  getAssignedRequests,
  updateRequestStatus,
} from "../../supabse_db/official/official";
import "../../styles/Requests.css";

export default function OfficialRequests() {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedRequests();
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

    // Cleanup on unmount
    return () => {
      pageContent.classList.remove('modal-open-blur');
    };
  }, [isDetailModalOpen]);

  const fetchAssignedRequests = async () => {
    try {
      const result = await getAssignedRequests();
      console.log("Raw result from getAssignedRequests:", result);

      // Handle error responses from database function
      if (!result.success) {
        console.error("Failed to fetch assigned requests:", result.message);
        setLoading(false);
        return;
      }

      // Unwrap data from successful response
      const data = result.data || [];
      if (data && Array.isArray(data)) {
        // Format data to match component requirements
        const formattedRequests = data.map((req) => {
          // Normalize status to uppercase
          const normalizedStatus = (
            req.request_status || "PENDING"
          ).toUpperCase();
          const lowercaseStatus = (
            req.request_status || "pending"
          ).toLowerCase();

          console.log("Formatting request:", req.id, {
            subject: req.subject,
            request_status: req.request_status,
            normalizedStatus: normalizedStatus,
            certificate_type: req.certificate_type,
            requester_name: req.requester_name,
          });

          return {
            id: req.id,
            title: req.subject || "Untitled Request",
            type: req.certificate_type || "REQUEST",
            status: normalizedStatus,
            submittedBy: req.requester_name || "User",
            submissionDate: req.created_at
              ? new Date(req.created_at).toLocaleDateString()
              : "N/A",
            updatedDate: req.updated_at
              ? new Date(req.updated_at).toLocaleDateString()
              : "N/A",
            statusColor: getStatusColor(lowercaseStatus),
            borderColor: getBorderColor(lowercaseStatus),
            description: req.description || "No description provided",
            internalNotes: req.remarks || "",
          };
        });

        console.log("Formatted requests:", formattedRequests);
        setRequests(formattedRequests);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching assigned requests:", error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#EF4444",
      resident_complied: "#14B8A6",
      for_compliance: "#8B5CF6",
      non_compliant: "#EC4899",
      for_validation: "#06B6D4",
    };
    return colorMap[status] || "#6B7280";
  };

  const getBorderColor = (status) => {
    const borderMap = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#DC2626",
      resident_complied: "#0D9488",
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
    "Resident Complied",
    "For Compliance",
    "Non Compliant",
    "For Validation",
  ];

  const handleFilterChange = (option) => {
    setFilterStatus(option);
    setIsFilterOpen(false);
  };

  const getFilteredRequests = () => {
    if (filterStatus === "All Status") {
      console.log("Showing all requests:", requests.length);
      return requests;
    }

    const statusMap = {
      "In Progress": "in_progress",
      Completed: "completed",
      Pending: "pending",
      Rejected: "rejected",
      "Resident Complied": "resident_complied",
      "For Compliance": "for_compliance",
      "Non Compliant": "non_compliant",
      "For Validation": "for_validation",
    };

    const dbStatus = statusMap[filterStatus];
    console.log(
      "Filtering by status:",
      filterStatus,
      "-> DB status:",
      dbStatus,
    );
    console.log(
      "All requests with status values:",
      requests.map((r) => ({ id: r.id, status: r.status })),
    );

    const filtered = requests.filter(
      (req) => req.status.toLowerCase() === dbStatus,
    );
    console.log("Filtered results:", filtered.length);

    return filtered;
  };

  const handleViewDetails = (requestId) => {
    const request = requests.find((req) => req.id === requestId);
    if (request) {
      setSelectedRequest(request);
      setIsDetailModalOpen(true);
      setIsFilterOpen(false);
    }
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  };

  const handleSaveRequest = async (updatedData) => {
    try {
      console.log("Saving request with data:", updatedData);

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
      console.log(
        "Converting status:",
        updatedData.status,
        "-> DB status:",
        dbStatus,
      );

      const result = await updateRequestStatus(
        updatedData.requestId,
        dbStatus,
        updatedData.internalNotes,
      );

      if (result.success) {
        console.log("Request saved successfully! Refreshing list...");
        await fetchAssignedRequests();
        handleCloseModal();
        console.log("Request updated successfully:", updatedData);
        alert("Request updated successfully!");
      } else {
        console.error("Failed to update request:", result.message);
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error("Error saving request update:", error);
      alert("Error saving request: " + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const lowercaseStatus = status.toLowerCase();
    const statusMap = {
      pending: { label: "PENDING", color: "#F59E0B" },
      in_progress: { label: "IN PROGRESS", color: "#0EA5E9" },
      completed: { label: "COMPLETED", color: "#10B981" },
      rejected: { label: "REJECTED", color: "#EF4444" },
      resident_complied: { label: "RESIDENT COMPLIED", color: "#14B8A6" },
      for_compliance: { label: "FOR COMPLIANCE", color: "#8B5CF6" },
      non_compliant: { label: "NON COMPLIANT", color: "#EC4899" },
      for_validation: { label: "FOR VALIDATION", color: "#06B6D4" },
    };
    return (
      statusMap[lowercaseStatus] || {
        label: status.toUpperCase(),
        color: "#6B7280",
      }
    );
  };

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h1 className="requests-title">Assigned Requests</h1>
        <p className="requests-subtitle">
          Review and manage citizen service requests
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
              <div className="loading-text">Loading requests...</div>
            </div>
          </div>
        ) : getFilteredRequests().length > 0 ? (
          getFilteredRequests().map((request) => {
            const statusBadge = getStatusBadge(request.status);
            return (
              <div
                key={request.id}
                className="request-card"
                style={{ borderLeft: `4px solid ${request.borderColor}` }}
              >
                <div className="request-badge">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusBadge.color }}
                  >
                    {statusBadge.label}
                  </span>
                  <span className="type-badge">{request.type}</span>
                </div>

                <h3 className="request-title">{request.title}</h3>

                <div className="request-metadata">
                  <div className="metadata-item">
                    <User size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Submitted by</span>
                      <span className="metadata-value">
                        {request.submittedBy}
                      </span>
                    </div>
                  </div>

                  <div className="metadata-item">
                    <Calendar size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Date Submitted</span>
                      <span className="metadata-value">
                        {request.submissionDate}
                      </span>
                    </div>
                  </div>

                  <div className="metadata-item">
                    <Clock size={16} color="#6B7280" />
                    <div>
                      <span className="metadata-label">Last Updated</span>
                      <span className="metadata-value">
                        {request.updatedDate}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="view-details-btn"
                  onClick={() => handleViewDetails(request.id)}
                >
                  View Details
                  <ArrowRight size={18} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <p>No requests found</p>
          </div>
        )}
      </div>

      <RequestDetail
        request={selectedRequest}
        itemType="request"
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRequest}
      />
    </div>
  );
}