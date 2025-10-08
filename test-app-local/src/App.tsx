import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeamworkAuth, Login, type TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

function App() {
  // Real Teamwork authentication with local auth service
  const authConfig: TeamworkAuthConfig = useMemo(() => ({
    domainKey: import.meta.env.VITE_DOMAIN_KEY || 'dev_localhost_3000',
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
    authServiceUrl,
    error,
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

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>⚠️ Auth Service Error</h1>
        <div style={{
          background: '#ffebee',
          border: '2px solid #f44336',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0',
          whiteSpace: 'pre-wrap',
          textAlign: 'left'
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🚀 Teamwork Auth - Local Test</h1>
        <div style={{
          background: '#e3f2fd',
          border: '2px solid #2196f3',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0'
        }}>
          <h3>🏠 LOCAL MODE</h3>
          <p><strong>Package:</strong> @mavenmm/teamwork-auth v2.0 (local build)</p>
          <p><strong>Auth Service:</strong> {authServiceUrl}</p>
          <p><strong>Port:</strong> 3000</p>
          <p><strong>Domain Key:</strong> dev_localhost_3000</p>
        </div>

        <p>Click below to login with your Teamwork account:</p>

        <Login
          clientID={import.meta.env.VITE_CLIENT_ID}
          redirectURI={import.meta.env.VITE_REDIRECT_URI}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: '#e8f5e9',
        border: '2px solid #4caf50',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1>✅ Authenticated!</h1>
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
        background: '#e3f2fd',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h3>🧪 V2.0 Architecture Active:</h3>
        <p><strong>Mode:</strong> Real Teamwork Auth (Local)</p>
        <p><strong>Package:</strong> @mavenmm/teamwork-auth v2.0</p>
        <p><strong>Auth Service:</strong> {authServiceUrl}</p>
        <p><strong>Access Token:</strong> 15-minute (auto-refresh)</p>
        <p><strong>Refresh Token:</strong> 7-day httpOnly cookie</p>
      </div>
    </div>
  );
}

export default App;