import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, User, ArrowRight } from 'lucide-react';
import RequestDetail from '../../components/RequestDetail';
import { getAssignedRequests, updateRequestStatus } from '../../supabse_db/official/official';
import '../../styles/Requests.css';

export default function OfficialRequests() {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedRequests();
  }, []);

  const fetchAssignedRequests = async () => {
    try {
      const result = await getAssignedRequests();
      console.log('Raw result from getAssignedRequests:', result);
      
      // Handle error responses from database function
      if (!result.success) {
        console.error('Failed to fetch assigned requests:', result.message);
        setLoading(false);
        return;
      }

      // Unwrap data from successful response
      const data = result.data || [];
      if (data && Array.isArray(data)) {
        // Format data to match component requirements
        const formattedRequests = data.map(req => {
          // Normalize status to uppercase
          const normalizedStatus = (req.request_status || 'PENDING').toUpperCase();
          
          console.log('Formatting request:', req.id, {
            subject: req.subject,
            request_status: req.request_status,
            normalizedStatus: normalizedStatus,
            certificate_type: req.certificate_type,
            requester_name: req.requester_name,
          });
          
          return {
            id: req.id,
            title: req.subject || 'Untitled Request',
            type: req.certificate_type || 'REQUEST',
            status: normalizedStatus,
            submittedBy: req.requester_name || 'User',
            submissionDate: req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A',
            updatedDate: req.updated_at ? new Date(req.updated_at).toLocaleDateString() : 'N/A',
            statusColor: getStatusColor(normalizedStatus),
            borderColor: getBorderColor(normalizedStatus),
            description: req.description || 'No description provided',
            internalNotes: req.remarks || '',
          };
        });
        
        console.log('Formatted requests:', formattedRequests);
        setRequests(formattedRequests);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching assigned requests:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'PENDING': '#FDB750',
      'IN_PROGRESS': '#4A90E2',
      'COMPLETED': '#50C878',
      'REJECTED': '#EF4444',
    };
    return colorMap[status] || '#6B7280';
  };

  const getBorderColor = (status) => {
    const borderMap = {
      'PENDING': 'transparent',
      'IN_PROGRESS': 'transparent',
      'COMPLETED': '#50C878',
      'REJECTED': '#EF4444',
    };
    return borderMap[status] || 'transparent';
  };

  const filterOptions = ['All Status', 'In Progress', 'Completed', 'Pending', 'Rejected'];

  const handleFilterChange = (option) => {
    setFilterStatus(option);
    setIsFilterOpen(false);
  };

  const getFilteredRequests = () => {
    if (filterStatus === 'All Status') {
      console.log('Showing all requests:', requests.length);
      return requests;
    }

    const statusMap = {
      'In Progress': 'IN_PROGRESS',
      'Completed': 'COMPLETED',
      'Pending': 'PENDING',
      'Rejected': 'REJECTED',
    };

    const dbStatus = statusMap[filterStatus];
    console.log('Filtering by status:', filterStatus, '-> DB status:', dbStatus);
    console.log('All requests with status values:', requests.map(r => ({ id: r.id, status: r.status })));
    
    const filtered = requests.filter(req => req.status === dbStatus);
    console.log('Filtered results:', filtered.length);
    
    return filtered;
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

  const handleSaveRequest = async (updatedData) => {
    try {
      console.log('Saving request with data:', updatedData);
      
      // Map frontend status (uppercase) to database status (lowercase)
      const statusMap = {
        'PENDING': 'pending',
        'IN_PROGRESS': 'in_progress',
        'COMPLETED': 'completed',
        'REJECTED': 'rejected',
      };
      
      const dbStatus = statusMap[updatedData.status] || updatedData.status.toLowerCase();
      console.log('Converting status:', updatedData.status, '-> DB status:', dbStatus);
      
      // Save to database
      const result = await updateRequestStatus(
        updatedData.requestId,
        dbStatus,
        updatedData.internalNotes
      );

      if (result.success) {
        console.log('Request saved successfully! Refreshing list...');
        
        // Refresh the requests list to get updated data from database
        await fetchAssignedRequests();
        
        // Close modal after successful update
        handleCloseModal();
        
        console.log('Request updated successfully:', updatedData);
        alert('Request updated successfully!');
      } else {
        console.error('Failed to update request:', result.message);
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving request update:', error);
      alert('Error saving request: ' + error.message);
    }
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
        {loading ? (
          <div className="empty-state">
            <p>Loading requests...</p>
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
