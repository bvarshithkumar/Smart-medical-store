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
    // Log the error in development mode
    console.error(`[ErrorBoundary] Caught render error in section "${this.props.sectionKey || 'unknown'}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // In development mode, display a helpful error indicator.
      // In production, return null so a failed section is hidden gracefully.
      const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      if (isDev) {
        return (
          <div 
            className="section-error-fallback"
            style={{
              padding: '24px',
              margin: '16px 0',
              border: '1px dashed rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.05)',
              color: '#fca5a5',
              fontFamily: 'monospace',
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: '#ef4444', fontWeight: 700 }}>
              ⚠️ Section "{this.props.sectionName || this.props.sectionKey}" Failed to Render
            </h4>
            <p style={{ margin: 0, opacity: 0.8 }}>{this.state.error?.toString()}</p>
          </div>
        );
      }
      return null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
