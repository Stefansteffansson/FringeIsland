import React from 'react';

const Card = ({ title, children, className = '', ...props }) => {
  return (
    <div className={`card ${className}`} {...props}>
      {title && <div className="card-header"><h3>{title}</h3></div>}
      <div className="card-body">
        {children}
      </div>

      <style>{`
        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        
        .card-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          background-color: #f8fafc;
        }
        
        .card-header h3 {
          margin: 0;
          font-size: 1rem;
          color: var(--color-text-main);
        }
        
        .card-body {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default Card;
