import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {}
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: 'darkred',
            color: 'white',
            height: '100vh',
            fontFamily: 'sans-serif',
          }}
        >
          <h1 style={{ fontSize: '3rem' }}>💥 React Crash 💥</h1>
          <pre
            style={{
              textAlign: 'left',
              background: 'rgba(0,0,0,0.5)',
              padding: 20,
              marginTop: 20,
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
