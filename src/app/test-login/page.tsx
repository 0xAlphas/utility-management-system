'use client';

import { useState, useEffect } from 'react';

export default function TestLoginPage() {
  // Set body background to white
  useEffect(() => {
    document.body.style.backgroundColor = '#f9fafb';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [testEndpoint, setTestEndpoint] = useState('/api/customers');
  const [testResponse, setTestResponse] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);
    setToken('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data);
        setToken(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    if (!token) {
      setError('Please login first to get a token');
      return;
    }

    setLoading(true);
    setTestResponse(null);
    setError('');

    try {
      const res = await fetch(testEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setTestResponse(data);
    } catch (err) {
      setError('API test error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '28px' }}>
          🔐 API Login Test Page
        </h1>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>
          Test your Utility Management System API
        </p>

      {/* Login Form */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#1e293b', fontWeight: '600' }}>Step 1: Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1e293b' }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1e293b' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>

        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#78350f',
          border: '1px solid #fde68a'
        }}>
          <strong>Default Credentials:</strong><br />
          admin / password123 (Admin)<br />
          reader01 / password123 (Meter Reader)<br />
          clerk01 / password123 (Clerk)<br />
          manager01 / password123 (Manager)
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Login Response */}
      {response && (
        <div style={{
          backgroundColor: '#f0fdf4',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #bbf7d0'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#166534' }}>
            ✅ Login Successful!
          </h2>
          <div style={{ marginBottom: '10px' }}>
            <strong>User:</strong> {response.user.name} ({response.user.role})
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Username:</strong> {response.user.username}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Email:</strong> {response.user.email}
          </div>
          <div style={{ marginTop: '15px' }}>
            <strong>JWT Token:</strong>
            <pre style={{
              backgroundColor: '#ffffff',
              color: '#059669',
              padding: '10px',
              borderRadius: '6px',
              overflow: 'auto',
              fontSize: '11px',
              marginTop: '5px',
              border: '1px solid #d1d5db',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap'
            }}>
              {token}
            </pre>
          </div>
        </div>
      )}

      {/* Test Other APIs */}
      {token && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#1e293b', fontWeight: '600' }}>
            Step 2: Test Other API Endpoints
          </h2>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1e293b' }}>
              Select Endpoint:
            </label>
            <select
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="/api/customers">GET /api/customers</option>
              <option value="/api/meters">GET /api/meters</option>
              <option value="/api/readings">GET /api/readings</option>
              <option value="/api/tariffs">GET /api/tariffs</option>
              <option value="/api/bills">GET /api/bills</option>
              <option value="/api/payments">GET /api/payments</option>
              <option value="/api/staff">GET /api/staff</option>
              <option value="/api/reports/dashboard">GET /api/reports/dashboard</option>
            </select>
          </div>
          <button
            onClick={testAPI}
            disabled={loading}
            style={{
              backgroundColor: '#059669',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Test API'}
          </button>
        </div>
      )}

      {/* API Test Response */}
      {testResponse && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#1e293b' }}>
            📊 API Response
          </h2>
          <pre style={{
            backgroundColor: '#ffffff',
            color: '#1e293b',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '500px',
            border: '1px solid #d1d5db',
            lineHeight: '1.6'
          }}>
            {JSON.stringify(testResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Quick Links */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#1e293b' }}>📚 Quick Links</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569' }}>
          <li style={{ marginBottom: '5px' }}>
            <a href="/API_DOCUMENTATION.md" style={{ color: '#2563eb', textDecoration: 'none' }}>
              API Documentation
            </a>
          </li>
          <li style={{ marginBottom: '5px' }}>
            <a href="/SETUP_GUIDE.md" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Setup Guide
            </a>
          </li>
          <li>
            <a href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Home
            </a>
          </li>
        </ul>
      </div>
      </div>
    </div>
  );
}
