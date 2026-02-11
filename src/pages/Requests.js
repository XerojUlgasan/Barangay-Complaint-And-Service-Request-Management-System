import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, User, ArrowRight } from 'lucide-react';
import RequestDetail from '../components/RequestDetail';
import '../styles/Requests.css';

/**
 * Requests Component
 * 
 * This component displays a list of citizen service requests assigned to the barangay official.
 * Features include filtering by status, viewing request details, and managing requests.
 * 
 * Data flow:
 * - Fetch requests from Supabase database
 * - Display requests in card format with status badges
 * - Allow filtering by request status (All, In Progress, Completed, Pending, etc.)
 * - Provide View Details action to manage individual requests
 * - Open RequestDetail modal when View Details is clicked
 * - Handle saving request status updates
 */
const Requests = () => {
  // State management for requests and filters
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal state management
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /**
   * useEffect hook - Fetch requests on component mount
   * TODO: Replace with actual API call to Supabase
   * const fetchRequests = async () => {
   *   const { data, error } = await supabase
   *     .from('requests')
   *     .select('*')
   *     .order('created_at', { ascending: false });
   * }
   */
  useEffect(() => {
    // Sample data - replace with actual database query
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

  // Filter options available to user
  const filterOptions = ['All Status', 'In Progress', 'Completed', 'Pending', 'Rejected'];

  /**
   * Handle filter selection
   * @param {string} option - The selected filter status
   * 
   * TODO: Implement filtering logic
   * const filteredRequests = requests.filter(req => 
   *   option === 'All Status' ? true : req.status === option.toUpperCase().replace(' ', '_')
   * );
   */
  const handleFilterChange = (option) => {
    setFilterStatus(option);
    setIsFilterOpen(false);
    // TODO: Trigger filter action to update displayed requests
  };

  /**
   * Handle View Details click - Opens RequestDetail modal
   * @param {number} requestId - The ID of the request to view
   * 
   * This function:
   * 1. Finds the request by ID from the requests array
   * 2. Sets it as the selected request
   * 3. Opens the detail modal
   */
  const handleViewDetails = (requestId) => {
    // Find the request object by ID
    const request = requests.find(req => req.id === requestId);
    if (request) {
      // Set the selected request and open modal
      setSelectedRequest(request);
      setIsDetailModalOpen(true);
    }
  };

  /**
   * Handle modal close - Closes the RequestDetail modal
   * Clears the selected request from state
   */
  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  };

  /**
   * Handle saving request updates from modal
   * @param {object} updatedData - Updated data from the modal form
   *   - requestId: ID of request being updated
   *   - status: New status value
   *   - internalNotes: Updated internal notes
   * 
   * This function:
   * 1. Updates the request in local state
   * 2. TODO: Call Supabase API to save changes to database
   * 3. Shows success notification
   * 
   * TODO: Implement API call to Supabase
   * const updateRequest = async (requestId, updates) => {
   *   const { data, error } = await supabase
   *     .from('requests')
   *     .update({
   *       status: updates.status,
   *       internal_notes: updates.internalNotes,
   *       updated_at: new Date()
   *     })
   *     .eq('id', requestId)
   *     .select()
   *     .single();
   * }
   */
  const handleSaveRequest = (updatedData) => {
    // Update request in state with new status and notes
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
    
    // TODO: Call API to save to database
    console.log('Saving request update:', updatedData);
  };

  /**
   * Determine status badge text and styling
   * @param {string} status - The request status from database
   * @returns {object} Object containing badge label and color
   */
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
      {/* Page Header Section */}
      <div className="requests-header">
        <h1 className="requests-title">Assigned Requests</h1>
        <p className="requests-subtitle">Review and manage citizen service requests</p>
      </div>

      {/* Filter Controls Section */}
      <div className="filter-section">
        <div className="filter-dropdown">
          <button
            className="filter-button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            {/* Filter Icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 5H17M5 10H15M7 15H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {/* Display current filter selection */}
            <span>{filterStatus}</span>
            {/* Dropdown toggle icon */}
            <ChevronDown size={20} className={`chevron ${isFilterOpen ? 'open' : ''}`} />
          </button>

          {/* Dropdown Menu - visible when filter is open */}
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

        {/* Close dropdown overlay when clicking outside */}
        {isFilterOpen && (
          <div
            className="filter-overlay"
            onClick={() => setIsFilterOpen(false)}
          />
        )}
      </div>

      {/* Requests List Section */}
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
                {/* Request Status Badge */}
                <div className="request-badge">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusBadge.color }}
                  >
                    {statusBadge.label}
                  </span>
                  {/* Request Type Tag */}
                  <span className="type-badge">{request.type}</span>
                </div>

                {/* Request Title */}
                <h3 className="request-title">{request.title}</h3>

                {/* Request Metadata Section */}
                <div className="request-metadata">
                  {/* Submitted by user */}
                  <div className="metadata-item">
                    <User size={16} />
                    <span>{request.submittedBy}</span>
                  </div>

                  {/* Submission Date */}
                  <div className="metadata-item">
                    <Calendar size={16} />
                    <span>{request.submissionDate}</span>
                  </div>

                  {/* Last Updated Date */}
                  <div className="metadata-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Updated: {request.updatedDate}</span>
                  </div>
                </div>

                {/* View Details Action Button */}
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
          // Empty state message when no requests found
          <div className="empty-state">
            <p>No requests found</p>
          </div>
        )}
      </div>

      {/* REQUEST DETAIL MODAL - Shows when View Details is clicked */}
      <RequestDetail
        request={selectedRequest}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRequest}
      />
    </div>
  );
};

export default Requests;
