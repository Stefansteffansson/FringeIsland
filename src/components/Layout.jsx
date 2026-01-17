import logo from '../assets/clinic-logo.png';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="main-header">
        <div className="container header-content">
          <div className="logo">
            <img src={logo} alt="Berga Tandvård" className="logo-img" />
          </div>
          <nav className="main-nav">
            <button className="btn btn-ghost">Översikt</button>
            <button className="btn btn-ghost">Patienter</button>
            <button className="btn btn-ghost">Logga ut</button>
          </nav>
        </div>
      </header>
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .main-header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          padding: 1rem 0;
          box-shadow: var(--shadow-sm);
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo {
          display: flex;
          align-items: center;
        }
        
        .logo-img {
            height: 50px;
            width: auto;
            object-fit: contain;
        }
        
        .main-nav {
          display: flex;
          gap: 1rem;
        }
        
        .btn-ghost {
          background: transparent;
          color: var(--color-text-muted);
        }
        
        .btn-ghost:hover {
          color: var(--color-primary);
          background-color: rgba(14, 116, 144, 0.05);
        }
        
        .main-content {
          flex: 1;
          padding: 2rem 0;
        }
      `}</style>
    </div>
  );
};

export default Layout;
