import React from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';

const Dashboard = () => {
  const patients = [
    { id: 1, name: 'Alice Smith', time: '09:00', type: 'Undersökning', status: 'Väntar' },
    { id: 2, name: 'Bob Jones', time: '10:30', type: 'Rotfyllning', status: 'Bekräftad' },
    { id: 3, name: 'Carol White', time: '13:00', type: 'Rengöring', status: 'Bekräftad' },
  ];

  return (
    <Layout>
      <div className="dashboard-grid">
        <section className="schedule-section">
          <h2>Dagens Schema</h2>
          <div className="schedule-list">
            {patients.map(p => (
              <Card key={p.id} className="appointment-card">
                <div className="apt-time">{p.time}</div>
                <div className="apt-details">
                  <h4>{p.name}</h4>
                  <span className="badge">{p.type}</span>
                </div>
                <div className={`status status-${p.status === 'Väntar' ? 'waiting' : 'confirmed'}`}>
                  {p.status}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <Card title="Snabbval">
            <div className="action-list">
              <button className="btn btn-outline">Ny Patient</button>
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
              <strong>8</strong>
            </div>
          </Card>
        </aside>
      </div>

      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 2rem;
        }
        
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .appointment-card {
          margin-bottom: 1rem;
          border-left: 4px solid var(--color-primary);
        }
        
        /* Deep selector for Card children usually requires passing className logic, but we used children */
        /* Hack: global styles for card content if needed, or inline styles in loop */
        
        .appointment-card :global(.card-body) {
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: 1rem;
        }

        .apt-time {
          font-weight: 700;
          color: var(--color-primary);
          min-width: 60px;
        }
        
        .apt-details h4 {
          margin: 0;
          font-size: 1rem;
        }
        
        .badge {
          display: inline-block;
          font-size: 0.75rem;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          margin-top: 0.25rem;
        }
        
        .status {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .status-waiting { color: var(--color-accent); }
        .status-confirmed { color: var(--color-primary); }
        
        .btn-outline {
          width: 100%;
          border: 1px solid var(--color-border);
          background: white;
          margin-bottom: 0.5rem;
        }
        
        .btn-outline:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        
        .mt-4 { margin-top: 1rem; }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-bg-base);
        }
      `}</style>
    </Layout>
  );
};

export default Dashboard;
