import React from 'react';
import Card from '../components/Card';
import logo from '../assets/clinic-logo.png';

const Home = ({ onLogin }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    if (!username || !password) {
      setError('Vänligen ange både ID och lösenord');
      return;
    }
    onLogin(username, password, (success) => {
      if (!success) setError('Ogiltiga uppgifter');
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="brand">
          <img src={logo} alt="Berga Tandvård" className="login-logo" />
        </div>

        <Card className="login-card">
          <div className="form-group">
            <label>Användarnamn</label>
            <input
              type="text"
              placeholder="Ange ID..."
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Lösenord</label>
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          <button className="btn btn-primary full-width" onClick={handleSubmit}>
            Logga in
          </button>
        </Card>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
        }
        
        .login-container {
          width: 100%;
          max-width: 400px;
          padding: 1rem;
        }
        
        .brand {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .login-logo {
            max-width: 100%;
            height: auto;
            max-height: 120px;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-main);
        }
        
        .input-field {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          font-family: inherit;
        }
        
        .input-field:focus {
          outline: 2px solid var(--color-primary-light);
          border-color: var(--color-primary);
        }
        
        .full-width {
          width: 100%;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Home;
