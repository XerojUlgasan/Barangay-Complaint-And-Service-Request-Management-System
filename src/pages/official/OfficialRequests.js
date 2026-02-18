import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, User, ArrowRight } from 'lucide-react';
import RequestDetail from '../../components/RequestDetail';
import '../../styles/Requests.css';

export default function OfficialRequests() {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    setRequests([
      {
        id: 1,
        title: 'Certificate of Indigency Request',
        type: 'CERTIFICATE OF INDIGENCY',
        status: 'IN_PROGRESS',
        submittedBy: 'user',
        submissionDate: '2/5/2026, 12:00:00 AM',
        updatedDate: '2/6/2026',
        statusColor: '#4A90E2',
        borderColor: 'transparent',
        description: 'Need certificate for medical assistance',
        internalNotes: 'Processing documents',
      },
      {
        id: 2,
        title: 'Barangay Clearance Request',
        type: 'BARANGAY CLEARANCE',
        status: 'COMPLETED',
        submittedBy: 'user',
        submissionDate: '2/1/2026',
        updatedDate: '2/3/2026',
        statusColor: '#50C878',
        borderColor: '#50C878',
        description: 'Need barangay clearance for employment',
        internalNotes: 'All requirements verified. Approved.',
      },
    ]);
  }, []);

  const filterOptions = ['All Status', 'In Progress', 'Completed', 'Pending', 'Rejected'];

  const handleFilterChange = (option) => {
    setFilterStatus(option);
    setIsFilterOpen(false);
  };

  const handleViewDetails = (requestId) => {
    const request = requests.find(req => req.id === requestId);
    if (request) {
      setSelectedRequest(request);
      setIsDetailModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  };

  const handleSaveRequest = (updatedData) => {
    setRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === updatedData.requestId
          ? {
              ...req,
              status: updatedData.status,
              internalNotes: updatedData.internalNotes,
              updatedDate: new Date().toLocaleDateString(),
            }
          : req
      )
    );
    console.log('Saving request update:', updatedData);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      IN_PROGRESS: { label: 'IN PROGRESS', color: '#4A90E2' },
      COMPLETED: { label: 'COMPLETED', color: '#50C878' },
      PENDING: { label: 'PENDING', color: '#FDB750' },
      REJECTED: { label: 'REJECTED', color: '#EF4444' },
    };
    return statusMap[status] || { label: status, color: '#6B7280' };
  };

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h1 className="requests-title">Assigned Requests</h1>
        <p className="requests-subtitle">Review and manage citizen service requests</p>
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
            <ChevronDown size={20} className={`chevron ${isFilterOpen ? 'open' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="filter-menu">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  className={`filter-item ${filterStatus === option ? 'active' : ''}`}
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
        {requests.length > 0 ? (
          requests.map((request) => {
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
                    <User size={16} />
                    <span>{request.submittedBy}</span>
                  </div>

                  <div className="metadata-item">
                    <Calendar size={16} />
                    <span>{request.submissionDate}</span>
                  </div>

                  <div className="metadata-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Updated: {request.updatedDate}</span>
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
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRequest}
      />
    </div>
  );
}
