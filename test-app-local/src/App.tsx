import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeamworkAuth, Login, type TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

function App() {
  // Mock mode for local development (no auth service needed)
  const authConfig: TeamworkAuthConfig = useMemo(() => ({
    authServiceUrl: 'http://localhost:9100', // Not used in mock mode
    mockMode: true, // Enable mock authentication for local development
  }), []);

  const { user, loading, isAuthenticated, logout, login } = useTeamworkAuth(authConfig);
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
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🚀 Teamwork Auth - Mock Mode Test</h1>
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0'
        }}>
          <h3>🧪 MOCK MODE</h3>
          <p><strong>Package:</strong> @mavenmm/teamwork-auth (local)</p>
          <p><strong>Mode:</strong> Mock authentication (no auth service needed)</p>
          <p><strong>Port:</strong> 3000</p>
        </div>

        <p>Click below to simulate login:</p>

        <button
          onClick={() => login('mock-code')}
          style={{
            background: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔐 Mock Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: '#fff3cd',
        border: '2px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1>✅ Mock Login Successful!</h1>
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
        <p><strong>Mode:</strong> Mock (Local Development)</p>
        <p><strong>Package:</strong> @mavenmm/teamwork-auth (local)</p>
        <p><strong>Hook:</strong> useTeamworkAuth() with mockMode: true</p>
      </div>
    </div>
  );
}

export default App;