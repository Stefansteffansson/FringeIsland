import { useState } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (username, password, callback) => {
    if (username.toLowerCase() === 'agnes' && password === 'agnes') {
      setUser({ name: 'Agnes', role: 'hygienist' });
      callback(true);
    } else {
      callback(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Home onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App
