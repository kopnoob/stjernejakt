import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * F4: fanger uventede render-feil slik at hele appen ikke blir en hvit skjerm.
 * Viser en vennlig melding + mulighet til å laste på nytt. Data ligger trygt
 * i localStorage, så en omstart mister ingenting.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app] uventet feil", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="screen error-screen" role="alert">
          <div className="error-card">
            <div className="error-emoji" aria-hidden="true">
              🌧️
            </div>
            <h1>Oi, noe gikk galt</h1>
            <p className="muted">
              Stjernene dine er trygt lagret. Prøv å laste appen på nytt.
            </p>
            <button className="btn btn-primary" onClick={() => location.reload()}>
              Last på nytt
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
