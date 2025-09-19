import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTeamworkAuth, Login, type TeamworkAuthConfig } from '@mavenmm/teamwork-auth';

function App() {
  const authConfig: TeamworkAuthConfig = useMemo(() => ({
    authServiceUrl: 'http://localhost:8888', // Local auth service
    cookieDomain: undefined, // No domain for localhost
  }), []);

  const { user, loading, isAuthenticated, logout, login } = useTeamworkAuth(authConfig);
  const location = useLocation();

  // Debug: Log hook state
  console.log('🎯 [APP] Hook state:', {
    user: user ? 'Present' : 'Null',
    loading,
    isAuthenticated,
    userDetails: user
  });

  // Debug: Log environment variables
  console.log('🔧 Environment Variables Debug:');
  console.log('VITE_CLIENT_ID:', import.meta.env.VITE_CLIENT_ID);
  console.log('VITE_CLIENT_SECRET:', import.meta.env.VITE_CLIENT_SECRET);
  console.log('VITE_REDIRECT_URI:', import.meta.env.VITE_REDIRECT_URI);
  console.log('--- Login component expects these: ---');
  console.log('VITE_TEAMWORK_CLIENT_ID:', import.meta.env.VITE_TEAMWORK_CLIENT_ID);
  console.log('VITE_TEAMWORK_CLIENT_SECRET:', import.meta.env.VITE_TEAMWORK_CLIENT_SECRET);
  console.log('VITE_TEAMWORK_REDIRECT_URI:', import.meta.env.VITE_TEAMWORK_REDIRECT_URI);
  console.log('JWT_KEY:', import.meta.env.JWT_KEY);
  console.log('DEV_ID:', import.meta.env.DEV_ID);
  console.log('All env vars:', import.meta.env);

  // Handle OAuth callback
  useEffect(() => {
    console.log('🔄 useEffect triggered - location.search:', location.search);
    console.log('🔄 useEffect triggered - isAuthenticated:', isAuthenticated);

    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    console.log('🔍 Extracted code from URL:', code);

    if (code) {
      if (!isAuthenticated) {
        console.log('🚀 Starting login process with code:', code);
        login(code).then((result) => {
          console.log('✅ Login succeeded:', result);
        }).catch((err: any) => {
          console.error('❌ Login failed:', err);
        });
      } else {
        console.log('⏭️ User already authenticated, skipping login');
      }
    } else {
      console.log('ℹ️ No code in URL, not processing OAuth callback');
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
        <h1>🚀 Teamwork Auth Test App</h1>
        <p>Please log in with your Teamwork account:</p>

        {/* Debug: Display environment variables on page */}
        <div style={{
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          margin: '20px 0',
          textAlign: 'left',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h3>🔧 Debug Info:</h3>
          <div><strong>Current URL:</strong> {window.location.href}</div>
          <div><strong>Search params:</strong> {location.search || 'None'}</div>
          <div><strong>OAuth code:</strong> {new URLSearchParams(location.search).get('code') || 'None'}</div>
          <div><strong>Auth loading:</strong> {loading ? 'Yes' : 'No'}</div>
          <div><strong>Is authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
          <hr style={{ margin: '10px 0' }} />
          <div><strong>VITE_TEAMWORK_CLIENT_ID:</strong> {import.meta.env.VITE_TEAMWORK_CLIENT_ID || '❌ NOT LOADED'}</div>
          <div><strong>VITE_TEAMWORK_REDIRECT_URI:</strong> {import.meta.env.VITE_TEAMWORK_REDIRECT_URI || '❌ NOT LOADED'}</div>
        </div>

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
        <p><strong>Auth Service:</strong> {authConfig.authServiceUrl}</p>
        <p><strong>Package:</strong> @mavenmm/teamwork-auth v2.0.0</p>
        <p><strong>Hook:</strong> useTeamworkAuth()</p>
      </div>
    </div>
  );
}

export default App;