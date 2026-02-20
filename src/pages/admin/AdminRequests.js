import React, { useState, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import '../../styles/BarangayAdmin.css';
import { getRequests } from '../../supabse_db/request/request';
import { getAllResidents, getAllOfficials } from '../../supabse_db/superadmin/superadmin';

const SAMPLE_REQUESTS = [
  {
    id: 'REQ-001',
    title: 'Certificate of Indigency Request',
    subtitle: 'Official poverty certification',
    status: 'In Progress',
    submittedBy: 'Maria Santos',
    date: '2025-12-10',
    lastUpdate: '2025-12-15',
    assignedOfficial: 'Jane Smith',
    description: 'Resident is requesting a certificate of indigency for medical assistance program enrollment. Supporting documents have been verified.',
    response: 'Document is being processed. Preliminary verification completed. Awaiting final approval from municipal office.'
  },
  {
    id: 'REQ-002',
    title: 'Barangay Clearance Application',
    subtitle: 'Good moral character certificate',
    status: 'Pending',
    submittedBy: 'Juan Dela Cruz',
    date: '2025-12-16',
    lastUpdate: '2025-12-16',
    assignedOfficial: 'Robert Johnson',
    description: 'Resident requires a barangay clearance for employment purposes. Background verification is in progress.',
    response: 'Assigned to verification team. Expected completion: 3 days.'
  },
  {
    id: 'REQ-003',
    title: 'Business Permit Application',
    subtitle: 'Small business registration',
    status: 'Completed',
    submittedBy: 'Ana Garcia',
    date: '2025-12-05',
    lastUpdate: '2025-12-14',
    assignedOfficial: 'Emily Roberts',
    description: 'Applicant is opening a small sari-sari store in the barangay. All required documents submitted and verified.',
    response: 'Business permit approved. Document ready for pickup at barangay office during office hours.'
  },
  {
    id: 'REQ-004',
    title: 'Complaint: Illegal Dumping',
    subtitle: 'Environmental concern',
    status: 'In Progress',
    submittedBy: 'Pedro Montoya',
    date: '2025-12-12',
    lastUpdate: '2025-12-15',
    assignedOfficial: 'Carlos Mendez',
    description: 'Resident reported illegal waste disposal near the community center. Photos and location coordinates provided.',
    response: 'Site inspection scheduled for December 18. Will coordinate with environmental team for immediate cleanup.'
  },
  {
    id: 'REQ-005',
    title: 'Street Repair Request',
    subtitle: 'Infrastructure maintenance',
    status: 'Rejected',
    submittedBy: 'Rosa Magsaysay',
    date: '2025-12-08',
    lastUpdate: '2025-12-13',
    assignedOfficial: 'Mark Wilson',
    description: 'Reported road damage on Main Street. However, subsequent inspection found damage to be within acceptable wear limits.',
    response: 'Request denied. Road condition meets current municipal standards. Scheduled for regular maintenance cycle.'
  },
];

const STATUS_COLORS = {
  'Pending': '#fbbf24',
  'In Progress': '#3b82f6',
  'Completed': '#10b981',
  'Rejected': '#ef4444'
};

export default function AdminRequests() {
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [requests, setRequests] = useState(SAMPLE_REQUESTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transform database request data to match UI format
  const transformRequestData = (dbRequest) => {
    return {
      id: dbRequest.id,
      title: dbRequest.subject || 'Untitled Request',
      subtitle: dbRequest.certificate_type || 'Service Request',
      status: dbRequest.status || 'Pending',
      submittedBy: dbRequest.requester_name || 'Unknown',
      date: dbRequest.created_at ? new Date(dbRequest.created_at).toISOString().split('T')[0] : 'N/A',
      lastUpdate: dbRequest.updated_at ? new Date(dbRequest.updated_at).toISOString().split('T')[0] : dbRequest.created_at ? new Date(dbRequest.created_at).toISOString().split('T')[0] : 'N/A',
      assignedOfficial: dbRequest.assigned_official_name || 'Unassigned',
      description: dbRequest.description || 'No description provided',
      response: dbRequest.remarks || 'No response yet'
    };
  };

  // Fetch requests on component mount
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('AdminRequests: Starting fetch...');
        const result = await getRequests();
        console.log('AdminRequests: getRequests result:', result);
        
        if (result.success && Array.isArray(result.data)) {
          console.log('AdminRequests: Raw data from DB:', result.data);
          // Transform the data to match UI expectations
          const transformedRequests = result.data.map(req => transformRequestData(req));
          console.log('AdminRequests: Transformed data:', transformedRequests);
          
          // If database returned results, use them; otherwise use sample data
          if (transformedRequests.length > 0) {
            setRequests(transformedRequests);
          } else {
            console.log('AdminRequests: No data in database, using sample data');
            setRequests(SAMPLE_REQUESTS);
          }
        } else {
          console.error('AdminRequests: Failed to fetch requests:', result.message);
          setError(result.message || 'Failed to fetch requests');
          // Keep sample data visible if fetch fails
          setRequests(SAMPLE_REQUESTS);
        }
      } catch (err) {
        console.error('AdminRequests: Catch error:', err);
        setError('Error fetching requests: ' + err.message);
        setRequests(SAMPLE_REQUESTS);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Filter requests based on status
  const filteredRequests = selectedStatus === 'All Status'
    ? requests
    : requests.filter(req => req.status === selectedStatus);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedRequest(null), 300);
  };

  const statusOptions = ['All Status', 'Pending', 'In Progress', 'Completed', 'Rejected'];

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="page-title">System-wide Requests</h2>
        <p className="page-subtitle">Global monitoring of all service requests and complaints.</p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          backgroundColor: '#fee2e2', 
          borderRadius: '0.5rem',
          color: '#991b1b'
        }}>
          Error: {error}
        </div>
      )}

      {/* Loading Display */}
      {loading && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1.5rem', 
          backgroundColor: '#dbeafe', 
          borderRadius: '0.5rem',
          color: '#1e40af'
        }}>
          Loading requests...
        </div>
      )}

      {/* Filter Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <div className="status-filter-wrapper">
          <button
            className="status-filter-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedStatus}
            <ChevronDown size={18} style={{ marginLeft: '0.5rem' }} />
          </button>
          {dropdownOpen && (
            <div className="status-filter-dropdown">
              {statusOptions.map(option => (
                <div
                  key={option}
                  className="status-filter-item"
                  onClick={() => {
                    setSelectedStatus(option);
                    setDropdownOpen(false);
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Requests Table */}
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
            {filteredRequests.map(request => (
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
                      backgroundColor: STATUS_COLORS[request.status],
                      color: '#fff'
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

      {/* Modal Overlay */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        />
      )}

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="request-modal">
          {/* Modal Header */}
          <div className="request-modal-header">
            <div className="modal-header-top">
              <h3 className="modal-request-title">
                {selectedRequest.title}
              </h3>
              <button
                className="modal-close-x"
                onClick={closeModal}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-header-badges">
              <span
                className="status-badge-modal"
                style={{
                  backgroundColor: STATUS_COLORS[selectedRequest.status],
                  color: '#fff'
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
                <p className="metadata-value">{selectedRequest.assignedOfficial}</p>
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
              <div className="response-box">
                {selectedRequest.response}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer-request">
            <button
              className="close-button"
              onClick={closeModal}
            >
              Close Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
