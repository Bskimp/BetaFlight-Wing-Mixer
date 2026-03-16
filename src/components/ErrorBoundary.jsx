import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{ marginTop: '1rem' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
