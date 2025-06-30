import React from 'react';
import { Alert } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    // Reset error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <Alert
              message="Ứng dụng gặp lỗi"
              description={
                <div>
                  <p>Có lỗi xảy ra trong ứng dụng FormAgent. Vui lòng thử lại.</p>
                  {process.env.NODE_ENV === 'development' && (
                    <details style={{ marginTop: '10px' }}>
                      <summary>Chi tiết lỗi (chỉ hiển thị trong development)</summary>
                      <pre style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '10px', 
                        marginTop: '10px',
                        fontSize: '12px',
                        overflow: 'auto'
                      }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              }
              type="error"
              showIcon
              action={
                <button 
                  onClick={this.handleRefresh}
                  style={{
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Tải lại trang
                </button>
              }
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;