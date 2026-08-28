import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import App from "./App";
import "../style.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <main className="error-boundary" role="alert">
        <h1>Unable to get a response. Please try again.</h1>
        <button type="button" onClick={() => this.setState({ hasError: false })}>Try again</button>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
