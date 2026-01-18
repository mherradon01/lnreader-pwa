// Shim for react-native-error-boundary on web
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(_error, _errorInfo) {
    // Error caught and will be displayed by boundary
  }

  resetError = () => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent, children } = this.props;
    const { error } = this.state;

    if (error && FallbackComponent) {
      return React.createElement(FallbackComponent, {
        error,
        resetError: this.resetError,
      });
    }

    return children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };
