import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeamworkAuth, Login, type TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

function App() {
  // Auto-detection: localhost uses local auth service (localhost:9100)
  // Production (*.mavenmm.com) uses production auth service (auth.mavenmm.com)
  const authConfig = useMemo(() => ({
    domainKey: import.meta.env.VITE_DOMAIN_KEY,
  }), []);

  const { user, loading, isAuthenticated, logout, login, error, authServiceUrl } = useTeamworkAuth(authConfig);
  const location = useLocation();

  // DEBUG: Log state for troubleshooting
  console.log('🐛 DEBUG - App State:', {
    loading,
    isAuthenticated,
    hasUser: !!user,
    userId: user?.id,
    userName: user ? `${user.firstName} ${user.lastName}` : 'No user',
    url: window.location.href,
    search: location.search,
  });

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');

    console.log('🔄 OAuth Callback Check:', { code, isAuthenticated });

    if (code && !isAuthenticated) {
      console.log('🚀 Attempting login with code...');
      login(code)
        .then(() => console.log('✅ Login successful'))
        .catch((err: any) => {
          console.error('❌ Login failed:', err);
        });
    }
  }, [location.search, isAuthenticated, login]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔄 Loading...</h2>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isLocalhost = authServiceUrl?.includes('localhost');

    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🚀 Teamwork Auth Test App</h1>
        <div style={{
          background: isLocalhost ? '#f0f8ff' : '#e8f5e8',
          border: isLocalhost ? '2px solid #2196f3' : '2px solid #4caf50',
          borderRadius: '8px',
          padding: '10px',
          margin: '10px 0',
          fontWeight: 'bold'
        }}>
          {isLocalhost ? '🏠 LOCAL DEV MODE' : '🌐 PRODUCTION MODE'}
          <br />
          <small>Auth Service: {authServiceUrl} (auto-detected)</small>
        </div>

        {/* Show error message if auth service is not reachable */}
        {error && (
          <div style={{
            background: '#fee',
            border: '2px solid #f44',
            borderRadius: '8px',
            padding: '15px',
            margin: '20px 0',
            whiteSpace: 'pre-line',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Debug Panel */}
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0',
          textAlign: 'left',
          fontSize: '13px',
          fontFamily: 'monospace'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🐛 Debug Info</h3>
          <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
          <div><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
          <div><strong>User:</strong> {user ? `${user.firstName} ${user.lastName}` : 'None'}</div>
          <div><strong>Current URL:</strong> {window.location.href}</div>
          <div><strong>OAuth Code:</strong> {new URLSearchParams(location.search).get('code') || 'None'}</div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
            Check browser console for detailed logs
          </div>
        </div>

        <p>Please log in with your Teamwork account:</p>

        <Login
          clientID={import.meta.env.VITE_TEAMWORK_CLIENT_ID || import.meta.env.VITE_CLIENT_ID}
          redirectURI={import.meta.env.VITE_TEAMWORK_REDIRECT_URI || import.meta.env.VITE_REDIRECT_URI}
          clientSecret={import.meta.env.VITE_TEAMWORK_CLIENT_SECRET || import.meta.env.VITE_CLIENT_SECRET}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: '#f0f8ff',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1>✅ Authentication Successful!</h1>
        <div style={{ marginBottom: '15px' }}>
          <strong>Welcome, {user?.firstName} {user?.lastName}!</strong>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <strong>Email:</strong> {user?.email}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <strong>User ID:</strong> {user?.id}
        </div>
        <div style={{ marginBottom: '15px' }}>
          <strong>Company:</strong> {user?.company?.name}
        </div>
        {user?.avatar && (
          <div style={{ marginBottom: '15px' }}>
            <img
              src={user.avatar}
              alt="Avatar"
              style={{ width: '50px', height: '50px', borderRadius: '50%' }}
            />
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={logout}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🚪 Logout
        </button>
      </div>

      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#e8f5e8',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h3>🧪 Testing Info:</h3>
        <p><strong>Auth Service:</strong> {authServiceUrl} (auto-detected)</p>
        <p><strong>Package:</strong> @mavenmm/teamwork-auth v2.0.1</p>
        <p><strong>Hook:</strong> useTeamworkAuth() - zero config!</p>
      </div>
    </div>
  );
}

export default App;