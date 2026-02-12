import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Calendar, Info, X } from 'lucide-react';
import '../../styles/BarangayAdmin.css';

export default function AdminAnnouncements() {
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', onKey);

    // lock body scroll when modal is open
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const items = [
    {
      id: 1,
      title: 'Community Clean-Up Drive',
      date: '2/7/2026',
      tag: 'EVENT',
      priority: 'Normal',
      desc:
        'Join us this Saturday for our monthly community clean-up drive. Meeting point is at the Barangay Hall at 6:00 AM. Please bring your own cleaning materials.',
      img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=60',
      border: 'success'
    },
    {
      id: 2,
      title: 'Important: Garbage Collection Schedule Change',
      date: '2/6/2026',
      tag: 'GENERAL',
      priority: 'High',
      desc:
        'Due to the upcoming holiday, garbage collection will be moved from Monday to Tuesday next week. Please adjust your disposal schedules accordingly.',
      img: 'https://images.unsplash.com/photo-1558981403-c5f989e22f38?auto=format&fit=crop&w=800&q=60',
      border: 'default'
    }
  ];

  return (
    <div className="admin-page announcements-wrap">
      <div className="page-actions" style={{alignItems:'center'}}>
        <div>
          <h3>Manage Announcements</h3>
          <p className="muted">Create and monitor official barangay updates</p>
        </div>
        <button className="btn-new-ann" onClick={openModal}>+ New Announcement</button>
      </div>

      <div className="announcements-list">
        {items.map((it) => (
          <div key={it.id} className={`announcement-card ${it.border === 'success' ? 'announcement-success' : ''}`}>
            <div className="announcement-left">
              <img src={it.img} alt={it.title} />
            </div>

            <div className="announcement-right">
              <div className="announcement-right-top">
                <div className="ann-icon"><Calendar size={18} /></div>
                <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
                  <div className="ann-title">{it.title}</div>
                  {it.priority && (
                    <div className={`priority-pill priority-${it.priority.toLowerCase()}`}>{it.priority.toUpperCase()}</div>
                  )}
                </div>
                <div className="ann-actions"><button className="ann-trash" title="Delete"><Trash2 size={16} /></button></div>
              </div>

              <div className="ann-meta">Posted by Barangay Captain • {it.date}</div>
              <div className="ann-desc">{it.desc}</div>
              <div className="ann-foot">
                <div className="ann-tag">{it.tag}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - only render when showModal is true */}
      {showModal && (
        <div className={`modal-overlay show`} onMouseDown={(e)=>{ if(e.target.classList.contains('modal-overlay')) closeModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" ref={modalRef} onMouseDown={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h4>Create Announcement</h4>
              <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="modal-body">
              <div className="two-col">
                <div className="form-row">
                  <label>Category</label>
                  <select>
                    <option>General</option>
                    <option>Event</option>
                    <option>Alert</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>Priority Level</label>
                  <select>
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label>Title</label>
                <input type="text" placeholder="E.g., Monthly Clean-up Drive" />
              </div>

              <div className="form-row">
                <label>Content</label>
                <textarea rows={5} placeholder="Details about the announcement..." />
              </div>

              <div className="form-row">
                <label>Picture Attachment (URL)</label>
                <div className="input-with-icon">
                  <input type="text" placeholder="https://images.unsplash.com/..." />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={closeModal} style={{background:'#16a34a',color:'#fff'}}>Post Announcement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
