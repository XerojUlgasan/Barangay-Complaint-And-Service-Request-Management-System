import React, { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import "../../styles/BarangayAdmin.css";
import { getRequests } from "../../supabse_db/request/request";
import { getComplaints } from "../../supabse_db/complaint/complaint";

const SAMPLE_REQUESTS = [
  {
    id: "REQ-001",
    title: "Certificate of Indigency Request",
    subtitle: "Official poverty certification",
    status: "In Progress",
    submittedBy: "Maria Santos",
    date: "2025-12-10",
    lastUpdate: "2025-12-15",
    assignedOfficial: "Jane Smith",
    description:
      "Resident is requesting a certificate of indigency for medical assistance program enrollment. Supporting documents have been verified.",
    response:
      "Document is being processed. Preliminary verification completed. Awaiting final approval from municipal office.",
  },
  {
    id: "REQ-002",
    title: "Barangay Clearance Application",
    subtitle: "Good moral character certificate",
    status: "Pending",
    submittedBy: "Juan Dela Cruz",
    date: "2025-12-16",
    lastUpdate: "2025-12-16",
    assignedOfficial: "Robert Johnson",
    description:
      "Resident requires a barangay clearance for employment purposes. Background verification is in progress.",
    response: "Assigned to verification team. Expected completion: 3 days.",
  },
  {
    id: "REQ-003",
    title: "Business Permit Application",
    subtitle: "Small business registration",
    status: "Completed",
    submittedBy: "Ana Garcia",
    date: "2025-12-05",
    lastUpdate: "2025-12-14",
    assignedOfficial: "Emily Roberts",
    description:
      "Applicant is opening a small sari-sari store in the barangay. All required documents submitted and verified.",
    response:
      "Business permit approved. Document ready for pickup at barangay office during office hours.",
  },
  {
    id: "REQ-004",
    title: "Complaint: Illegal Dumping",
    subtitle: "Environmental concern",
    status: "In Progress",
    submittedBy: "Pedro Montoya",
    date: "2025-12-12",
    lastUpdate: "2025-12-15",
    assignedOfficial: "Carlos Mendez",
    description:
      "Resident reported illegal waste disposal near the community center. Photos and location coordinates provided.",
    response:
      "Site inspection scheduled for December 18. Will coordinate with environmental team for immediate cleanup.",
  },
  {
    id: "REQ-005",
    title: "Street Repair Request",
    subtitle: "Infrastructure maintenance",
    status: "Rejected",
    submittedBy: "Rosa Magsaysay",
    date: "2025-12-08",
    lastUpdate: "2025-12-13",
    assignedOfficial: "Mark Wilson",
    description:
      "Reported road damage on Main Street. However, subsequent inspection found damage to be within acceptable wear limits.",
    response:
      "Request denied. Road condition meets current municipal standards. Scheduled for regular maintenance cycle.",
  },
];

const SAMPLE_COMPLAINTS = [
  {
    id: "COMP-001",
    title: "Noise Disturbance",
    subtitle: "Community complaint",
    status: "Pending",
    submittedBy: "Elena Cruz",
    date: "2025-12-11",
    lastUpdate: "2025-12-11",
    assignedOfficial: "Unassigned",
    description:
      "Loud music reported late at night in Zone 3. Multiple residents affected.",
    response: "No response yet",
  },
  {
    id: "COMP-002",
    title: "Illegal Parking",
    subtitle: "Public safety concern",
    status: "In Progress",
    submittedBy: "Marco Reyes",
    date: "2025-12-09",
    lastUpdate: "2025-12-14",
    assignedOfficial: "Andrea Flores",
    description:
      "Vehicles blocking the main road during peak hours. Photos provided.",
    response: "Barangay patrol assigned. Warning notices issued.",
  },
];

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Rejected: "#ef4444",
  "For Compliance": "#8b5cf6",
  "Non Compliant": "#ec4899",
  "For Validation": "#06b6d4",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  for_compliance: "For Compliance",
  non_compliant: "Non Compliant",
  for_validation: "For Validation",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";

export default function AdminRequests() {
  const [selectedRequestStatus, setSelectedRequestStatus] =
    useState("All Status");
  const [selectedComplaintStatus, setSelectedComplaintStatus] =
    useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [complaintDropdownOpen, setComplaintDropdownOpen] = useState(false);
  const [requests, setRequests] = useState(SAMPLE_REQUESTS);
  const [complaints, setComplaints] = useState(SAMPLE_COMPLAINTS);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);
  const [errorComplaints, setErrorComplaints] = useState(null);

  // Transform database request data to match UI format
  const transformRequestData = (dbRequest) => {
    return {
      id: dbRequest.id,
      title: dbRequest.subject || "Untitled Request",
      subtitle: dbRequest.certificate_type || "Service Request",
      status: normalizeStatus(dbRequest.request_status || dbRequest.status),
      submittedBy: dbRequest.requester_name || "Unknown",
      date: dbRequest.created_at
        ? new Date(dbRequest.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbRequest.updated_at
        ? new Date(dbRequest.updated_at).toISOString().split("T")[0]
        : dbRequest.created_at
          ? new Date(dbRequest.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficial: dbRequest.assigned_official_name || "Unassigned",
      description: dbRequest.description || "No description provided",
      response: dbRequest.remarks || "No response yet",
    };
  };

  const transformComplaintData = (dbComplaint) => {
    return {
      id: dbComplaint.id,
      title: dbComplaint.complaint_type || "Complaint",
      subtitle: dbComplaint.incident_location || "Community concern",
      status: normalizeStatus(dbComplaint.status),
      submittedBy: dbComplaint.complainant_name || "Unknown",
      date: dbComplaint.created_at
        ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbComplaint.updated_at
        ? new Date(dbComplaint.updated_at).toISOString().split("T")[0]
        : dbComplaint.created_at
          ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficial: dbComplaint.assigned_official_name || "Unassigned",
      description: dbComplaint.description || "No description provided",
      response: dbComplaint.remarks || "No response yet",
    };
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);
        setErrorRequests(null);
        console.log("AdminRequests: Starting fetch...");
        const result = await getRequests();
        console.log("AdminRequests: getRequests result:", result);

        if (result.success && Array.isArray(result.data)) {
          console.log("AdminRequests: Raw data from DB:", result.data);
          // Transform the data to match UI expectations
          const transformedRequests = result.data.map((req) =>
            transformRequestData(req),
          );
          console.log("AdminRequests: Transformed data:", transformedRequests);

          // If database returned results, use them; otherwise use sample data
          if (transformedRequests.length > 0) {
            setRequests(transformedRequests);
          } else {
            console.log(
              "AdminRequests: No data in database, using sample data",
            );
            setRequests(SAMPLE_REQUESTS);
          }
        } else {
          console.error(
            "AdminRequests: Failed to fetch requests:",
            result.message,
          );
          setErrorRequests(result.message || "Failed to fetch requests");
          // Keep sample data visible if fetch fails
          setRequests(SAMPLE_REQUESTS);
        }
      } catch (err) {
        console.error("AdminRequests: Catch error:", err);
        setErrorRequests("Error fetching requests: " + err.message);
        setRequests(SAMPLE_REQUESTS);
      } finally {
        setLoadingRequests(false);
      }
    };

    const fetchComplaints = async () => {
      try {
        setLoadingComplaints(true);
        setErrorComplaints(null);
        console.log("AdminRequests: Starting complaints fetch...");
        const result = await getComplaints();
        console.log("AdminRequests: getComplaints result:", result);

        if (result.success && Array.isArray(result.data)) {
          const transformedComplaints = result.data.map((item) =>
            transformComplaintData(item),
          );
          if (transformedComplaints.length > 0) {
            setComplaints(transformedComplaints);
          } else {
            console.log(
              "AdminRequests: No complaint data in database, using sample data",
            );
            setComplaints(SAMPLE_COMPLAINTS);
          }
        } else {
          console.error(
            "AdminRequests: Failed to fetch complaints:",
            result.message,
          );
          setErrorComplaints(result.message || "Failed to fetch complaints");
          setComplaints(SAMPLE_COMPLAINTS);
        }
      } catch (err) {
        console.error("AdminRequests: Complaints catch error:", err);
        setErrorComplaints("Error fetching complaints: " + err.message);
        setComplaints(SAMPLE_COMPLAINTS);
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchRequests();
    fetchComplaints();
  }, []);

  // Filter requests based on status
  const filteredRequests =
    selectedRequestStatus === "All Status"
      ? requests
      : requests.filter((req) => req.status === selectedRequestStatus);

  // Filter complaints based on status
  const filteredComplaints =
    selectedComplaintStatus === "All Status"
      ? complaints
      : complaints.filter((item) => item.status === selectedComplaintStatus);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeComplaintModal();
      }
    };
    if (isModalOpen || isComplaintModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isComplaintModalOpen]);

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedRequest(null), 300);
  };

  const openComplaintModal = (complaint) => {
    setSelectedComplaint(complaint);
    setIsComplaintModalOpen(true);
  };

  const closeComplaintModal = () => {
    setIsComplaintModalOpen(false);
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  const statusOptions = [
    "All Status",
    "Pending",
    "In Progress",
    "Completed",
    "Rejected",
    "For Compliance",
    "Non Compliant",
    "For Validation",
  ];

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">System-wide Requests and Complaints</h2>
        <p className="page-subtitle">
          Monitor all requests and complaints across the barangay.
        </p>
      </div>

      {/* REQUESTS SECTION */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h3 className="page-title" style={{ fontSize: "1.25rem" }}>
              Requests
            </h3>
            <p className="page-subtitle" style={{ marginTop: "0.25rem" }}>
              All service requests submitted by residents.
            </p>
          </div>
          <div className="status-filter-wrapper">
            <button
              className="status-filter-btn"
              onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
            >
              {selectedRequestStatus}
              <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
            </button>
            {requestDropdownOpen && (
              <div className="status-filter-dropdown">
                {statusOptions.map((option) => (
                  <div
                    key={option}
                    className="status-filter-item"
                    onClick={() => {
                      setSelectedRequestStatus(option);
                      setRequestDropdownOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {errorRequests && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#fee2e2",
              borderRadius: "0.5rem",
              color: "#991b1b",
            }}
          >
            Error: {errorRequests}
          </div>
        )}

        {loadingRequests && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#dbeafe",
              borderRadius: "0.5rem",
              color: "#1e40af",
            }}
          >
            Loading requests...
          </div>
        )}

        <div className="requests-table-card">
          <table className="requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Request Details</th>
                <th>Status</th>
                <th>Submitted By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td className="req-id">{request.id}</td>
                  <td className="req-details">
                    <div className="req-title">{request.title}</div>
                    <div className="req-subtitle">{request.subtitle}</div>
                  </td>
                  <td className="req-status">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(request.status),
                        color: "#fff",
                      }}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="req-submitted">{request.submittedBy}</td>
                  <td className="req-action">
                    <button
                      className="view-details-btn"
                      onClick={() => openModal(request)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPLAINTS SECTION */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h3 className="page-title" style={{ fontSize: "1.25rem" }}>
              Complaints
            </h3>
            <p className="page-subtitle" style={{ marginTop: "0.25rem" }}>
              All complaints filed by residents.
            </p>
          </div>
          <div className="status-filter-wrapper">
            <button
              className="status-filter-btn"
              onClick={() => setComplaintDropdownOpen(!complaintDropdownOpen)}
            >
              {selectedComplaintStatus}
              <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
            </button>
            {complaintDropdownOpen && (
              <div className="status-filter-dropdown">
                {statusOptions.map((option) => (
                  <div
                    key={option}
                    className="status-filter-item"
                    onClick={() => {
                      setSelectedComplaintStatus(option);
                      setComplaintDropdownOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {errorComplaints && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#fee2e2",
              borderRadius: "0.5rem",
              color: "#991b1b",
            }}
          >
            Error: {errorComplaints}
          </div>
        )}

        {loadingComplaints && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: "#dbeafe",
              borderRadius: "0.5rem",
              color: "#1e40af",
            }}
          >
            Loading complaints...
          </div>
        )}

        <div className="requests-table-card">
          <table className="requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Complaint Details</th>
                <th>Status</th>
                <th>Submitted By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className="req-id">{complaint.id}</td>
                  <td className="req-details">
                    <div className="req-title">{complaint.title}</div>
                    <div className="req-subtitle">{complaint.subtitle}</div>
                  </td>
                  <td className="req-status">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(complaint.status),
                        color: "#fff",
                      }}
                    >
                      {complaint.status}
                    </span>
                  </td>
                  <td className="req-submitted">{complaint.submittedBy}</td>
                  <td className="req-action">
                    <button
                      className="view-details-btn"
                      onClick={() => openComplaintModal(complaint)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && <div className="modal-overlay" onClick={closeModal} />}

      {isComplaintModalOpen && (
        <div className="modal-overlay" onClick={closeComplaintModal} />
      )}

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="request-modal">
          {/* Modal Header */}
          <div className="request-modal-header">
            <div className="modal-header-top">
              <h3 className="modal-request-title">{selectedRequest.title}</h3>
              <button className="modal-close-x" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-header-badges">
              <span
                className="status-badge-modal"
                style={{
                  backgroundColor: getStatusColor(selectedRequest.status),
                  color: "#fff",
                }}
              >
                {selectedRequest.status.toUpperCase()}
              </span>
              <span className="admin-tag-modal">System Admin View</span>
            </div>
          </div>

          {/* Modal Content */}
          <div className="modal-body">
            {/* Metadata Grid */}
            <div className="request-metadata-grid">
              <div className="metadata-item">
                <label className="metadata-label">Citizen</label>
                <p className="metadata-value">{selectedRequest.submittedBy}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Submitted</label>
                <p className="metadata-value">{selectedRequest.date}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Last Update</label>
                <p className="metadata-value">{selectedRequest.lastUpdate}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Assigned Official</label>
                <p className="metadata-value">
                  {selectedRequest.assignedOfficial}
                </p>
              </div>
            </div>

            {/* Description Box */}
            <div className="request-section">
              <h4 className="section-title">Request Description</h4>
              <div className="description-box">
                {selectedRequest.description}
              </div>
            </div>

            {/* Response Box */}
            <div className="request-section">
              <h4 className="section-title">Official Response / Notes</h4>
              <div className="response-box">{selectedRequest.response}</div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer-request">
            <button className="close-button" onClick={closeModal}>
              Close Monitor
            </button>
          </div>
        </div>
      )}

      {isComplaintModalOpen && selectedComplaint && (
        <div className="request-modal">
          <div className="request-modal-header">
            <div className="modal-header-top">
              <h3 className="modal-request-title">{selectedComplaint.title}</h3>
              <button className="modal-close-x" onClick={closeComplaintModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-header-badges">
              <span
                className="status-badge-modal"
                style={{
                  backgroundColor: getStatusColor(selectedComplaint.status),
                  color: "#fff",
                }}
              >
                {selectedComplaint.status.toUpperCase()}
              </span>
              <span className="admin-tag-modal">System Admin View</span>
            </div>
          </div>

          <div className="modal-body">
            <div className="request-metadata-grid">
              <div className="metadata-item">
                <label className="metadata-label">Citizen</label>
                <p className="metadata-value">
                  {selectedComplaint.submittedBy}
                </p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Submitted</label>
                <p className="metadata-value">{selectedComplaint.date}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Last Update</label>
                <p className="metadata-value">{selectedComplaint.lastUpdate}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Assigned Official</label>
                <p className="metadata-value">
                  {selectedComplaint.assignedOfficial}
                </p>
              </div>
            </div>

            <div className="request-section">
              <h4 className="section-title">Complaint Description</h4>
              <div className="description-box">
                {selectedComplaint.description}
              </div>
            </div>

            <div className="request-section">
              <h4 className="section-title">Official Response / Notes</h4>
              <div className="response-box">{selectedComplaint.response}</div>
            </div>
          </div>

          <div className="modal-footer-request">
            <button className="close-button" onClick={closeComplaintModal}>
              Close Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
