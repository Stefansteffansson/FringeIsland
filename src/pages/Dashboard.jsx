import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Modal from '../components/Modal';

const PIXELS_PER_MINUTE = 2;
const START_HOUR = 8;
const SNAP_MINUTES = 15;
const SNAP_PIXELS = SNAP_MINUTES * PIXELS_PER_MINUTE;
const DRAG_THRESHOLD = 5; // Pixels to move before counting as a drag

const Dashboard = ({ onLogout }) => {
  const [patients, setPatients] = useState([
    { id: 1, name: 'Alice Smith', time: '09:00', type: 'Undersökning', status: 'Väntar', duration: 45 },
    { id: 2, name: 'Bob Jones', time: '10:30', type: 'Rotfyllning', status: 'Bekräftad', duration: 60 },
    { id: 3, name: 'Carol White', time: '13:00', type: 'Rengöring', status: 'Bekräftad', duration: 30 },
  ]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Dragging State
  const [dragState, setDragState] = useState(null); // { id, mode: 'move'|'resize', startY, originalTime, originalDuration, hasMoved }
  const isDragging = useRef(false);

  // Helper: Time String <-> Minutes from Start
  const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return (h - START_HOUR) * 60 + m;
  };

  const minutesToTime = (minutes) => {
    const totalMinutes = minutes + (START_HOUR * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleMouseDown = (e, patient, mode) => {
    // Only prevents default if it's not a button click, to allow button interactions
    if (e.target.closest('button')) return;

    e.preventDefault(); // Prevent text selection

    // Initialize potential drag
    setDragState({
      id: patient.id,
      mode,
      startY: e.clientY,
      currentY: e.clientY,
      originalTimeMinutes: timeToMinutes(patient.time),
      originalDuration: patient.duration || 60,
      hasMoved: false
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState) return;

      const deltaY = e.clientY - dragState.startY;
      const absDelta = Math.abs(deltaY);

      // Check threshold - only start "dragging" if moved enough
      if (!dragState.hasMoved && absDelta > DRAG_THRESHOLD) {
        setDragState(prev => ({ ...prev, hasMoved: true }));
        isDragging.current = true;
      }

      // If we haven't crossed threshold yet, just render updates if we are officially dragging or if we want responsive feedback
      // Optimally, we wait for threshold.
      if (!isDragging.current) return;

      const deltaMinutes = deltaY / PIXELS_PER_MINUTE;

      setPatients(prev => prev.map(p => {
        if (p.id !== dragState.id) return p;

        if (dragState.mode === 'move') {
          let newMinutes = dragState.originalTimeMinutes + deltaMinutes;
          // Snap
          newMinutes = Math.round(newMinutes / SNAP_MINUTES) * SNAP_MINUTES;
          // Boundaries (08:00 to 17:00 approx)
          newMinutes = Math.max(0, newMinutes);

          return { ...p, time: minutesToTime(newMinutes) };
        } else if (dragState.mode === 'resize') {
          let newDuration = dragState.originalDuration + deltaMinutes;
          // Snap
          newDuration = Math.round(newDuration / SNAP_MINUTES) * SNAP_MINUTES;
          // Min Duration
          newDuration = Math.max(15, newDuration);

          return { ...p, duration: newDuration };
        }
        return p;
      }));
    };

    const handleMouseUp = (e) => {
      if (!dragState) return;

      // If we never moved significantly, treat as Click, BUT only if mode was 'move' (clicking body)
      // If mode was 'resize' and we didn't move, we probably just clicked the handle, no action needed.
      if (!isDragging.current && dragState.mode === 'move') {
        const patient = patients.find(p => p.id === dragState.id);
        if (patient) {
          setSelectedAppointment({ ...patient });
        }
      }

      // Reset
      isDragging.current = false;
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, patients]);

  const handleNewPatient = () => {
    setSelectedAppointment({
      id: null,
      name: '',
      time: '08:00',
      type: 'Undersökning',
      status: 'Väntar',
      duration: 60
    });
  };

  const handleCloseModal = () => setSelectedAppointment(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedAppointment(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const toSave = {
      ...selectedAppointment,
      duration: parseInt(selectedAppointment.duration, 10) || 60
    };

    if (toSave.id) {
      setPatients(patients.map(p => p.id === toSave.id ? toSave : p));
    } else {
      const newId = Math.max(...patients.map(p => p.id), 0) + 1;
      setPatients([...patients, { ...toSave, id: newId }]);
    }
    handleCloseModal();
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    if (confirm('Är du säker på att du vill ta bort bokningen?')) {
      setPatients(patients.filter(p => p.id !== id));
      handleCloseModal();
    }
  };

  /* Helper to calculate position based on time (08:00 start) */
  const getPositionStyle = (time, duration) => {
    const minutesFromStart = timeToMinutes(time);
    const height = (duration || 60) * PIXELS_PER_MINUTE;

    return {
      top: `${minutesFromStart * PIXELS_PER_MINUTE}px`,
      height: `${height}px`,
      position: 'absolute',
      width: '95%',
      right: 0
    };
  };

  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h !== 17) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <Layout onLogout={onLogout}>
      <div className="dashboard-grid">
        <section className="timeline-section">
          <h2>Dagens Schema</h2>
          <div className="timeline-container">
            <div className="time-labels">
              {timeSlots.map(time => (
                <div key={time} className="time-slot-label">
                  <span>{time}</span>
                </div>
              ))}
            </div>
            <div className="appointment-track">
              {/* Grid Lines */}
              {timeSlots.map(time => (
                <div key={time} className="time-grid-line"></div>
              ))}

              {/* Appointments */}
              {patients.map(p => (
                <Card
                  key={p.id}
                  className={`appointment-card timeline-card ${dragState?.id === p.id && isDragging.current ? 'dragging' : ''}`}
                  style={{
                    ...getPositionStyle(p.time, p.duration),
                    zIndex: dragState?.id === p.id && isDragging.current ? 100 : 10
                  }}
                  onMouseDown={(e) => handleMouseDown(e, p, 'move')}
                >
                  <div className="card-content-wrapper">
                    <div className="apt-main">
                      <h4>{p.name}</h4>
                      <span className="type-label">{p.type}</span>
                    </div>

                    <div className="apt-actions">
                      <div className="status-container">
                        <div className={`status status-${p.status === 'Väntar' ? 'waiting' : 'confirmed'}`}>
                          {p.status}
                        </div>
                        <div className="duration-label">
                          {p.duration || 60} min
                        </div>
                      </div>
                      <button
                        className="btn-icon delete-btn"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleDelete(p.id, e)}
                        title="Ta bort bokning"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Resize Handle */}
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation(); // CRITICAL: Stop move handler from firing
                      handleMouseDown(e, p, 'resize');
                    }}
                  ></div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <aside className="sidebar">
          <Card title="Snabbval">
            <div className="action-list">
              <button className="btn btn-outline" onClick={handleNewPatient}>Ny Patient</button>
              <button className="btn btn-outline">Boka Tid</button>
            </div>
          </Card>

          <Card title="Statistik" className="mt-4">
            <div className="stat-row">
              <span>Totalt Antal Patienter</span>
              <strong>1243</strong>
            </div>
            <div className="stat-row">
              <span>Idag</span>
              <strong>{patients.length}</strong>
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        isOpen={!!selectedAppointment}
        onClose={handleCloseModal}
        title={selectedAppointment?.id ? "Redigera Bokning" : "Ny Patient"}
      >
        {selectedAppointment && (
          <form onSubmit={handleSave} className="edit-form">
            <div className="form-group">
              <label>Patient</label>
              <input
                type="text"
                name="name"
                value={selectedAppointment.name}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Tid</label>
                <input
                  type="time"
                  name="time"
                  value={selectedAppointment.time}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Längd (min)</label>
                <input
                  type="number"
                  name="duration"
                  value={selectedAppointment.duration}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Behandling</label>
                <input
                  type="text"
                  name="type"
                  value={selectedAppointment.type}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Status</label>
                <select
                  name="status"
                  value={selectedAppointment.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="Väntar">Väntar</option>
                  <option value="Bekräftad">Bekräftad</option>
                  <option value="Klar">Klar</option>
                  <option value="Avbokad">Avbokad</option>
                </select>
              </div>
            </div>

            <div className="form-actions" style={{ justifyContent: 'space-between' }}>
              {selectedAppointment.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedAppointment.id)}
                  className="btn btn-danger"
                >
                  Ta bort
                </button>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-ghost">Avbryt</button>
                <button type="submit" className="btn btn-primary">Spara</button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 2rem;
          height: calc(100vh - 100px);
        }
        
        .timeline-section {
          overflow-y: auto;
          background: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          user-select: none; /* Prevent selection while dragging */
        }

        .timeline-container {
          display: flex;
          position: relative;
          padding-top: 1rem;
        }

        .time-labels {
          width: 50px;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .time-slot-label {
          height: 60px; /* 30 min slots = 60px height */
          font-size: 0.8rem;
          color: #888;
          text-align: right;
          padding-right: 0.5rem;
          position: relative;
          top: -10px; /* Align text with grid line */
        }

        .appointment-track {
          flex-grow: 1;
          position: relative;
          height: 1200px; /* Explicit height to cover day */
        }

        .time-grid-line {
          height: 60px;
          border-top: 1px solid #eee;
          width: 100%;
          box-sizing: border-box;
        }

        /* Card Overrides for Timeline */
        .timeline-card {
          border-left: 4px solid var(--color-primary);
          background: #f8fafc;
          padding: 0; 
          z-index: 10;
          box-shadow: var(--shadow-sm);
          transition: box-shadow 0.2s; 
          cursor: grab;
          overflow: visible; 
        }
        
        .timeline-card.dragging {
          cursor: grabbing;
          opacity: 0.9;
          box-shadow: var(--shadow-lg);
          z-index: 100;
        }

        .timeline-card:hover {
          z-index: 20;
          box-shadow: var(--shadow-md);
        }

        .timeline-card :global(.card-body) {
           padding: 0.25rem 0.75rem;
           height: 100%;
           display: flex;
           align-items: center;
           position: relative;
        }

        .card-content-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          height: 100%;
        }

        .apt-main {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.2rem;
          pointer-events: none; /* Let clicks pass to card */
        }

        .apt-main h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
        }

        .type-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        .apt-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-right: 0.5rem;
        }

        .status {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .duration-label {
           font-size: 1rem;
           font-weight: 600;
           color: var(--color-primary);
        }
        
        .status-waiting { color: var(--color-accent); }
        .status-confirmed { color: var(--color-primary); }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          opacity: 0.6;
          transition: opacity 0.2s;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-icon:hover {
          opacity: 1;
          background: #e2e8f0;
          border-radius: 4px;
        }
        
        .delete-btn:hover {
            color: #ef4444;
            background: #fee2e2;
        }

        /* Resize Handle */
        .resize-handle {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 10px; /* Increased hit area slightly */
          cursor: ns-resize;
          background: transparent;
          z-index: 50; /* Ensure on top for interaction */
        }
        .resize-handle:hover {
          background: rgba(0,0,0,0.05);
        }

        /* Sidebar & Utils */
        .sidebar {
          position: sticky;
          top: 0;
        }

        .btn-outline {
          width: 100%;
          border: 1px solid var(--color-border);
          background: white;
          margin-bottom: 0.5rem;
          padding: 0.5rem;
          border-radius: 4px;
        }
        
        .btn-outline:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-bg-base);
        }

        /* Form Styles */
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; }
        .input-field { width: 100%; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: 0.25rem; }
        .form-actions { display: flex; gap: 1rem; margin-top: 2rem; align-items: center; }
        .btn-danger { background-color: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer; }
        
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
};

export default Dashboard;
