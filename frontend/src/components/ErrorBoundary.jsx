import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: '#fff3f3',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '2.5rem',
            maxWidth: '480px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ color: '#991b1b', margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              We encountered an unexpected error while rendering this page. Your data is safe, but please try refreshing the application.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#991b1b',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
