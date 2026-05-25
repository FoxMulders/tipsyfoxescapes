import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/** Catches render errors in the builder workspace so the shell/nav stay usable. */
export class BuilderErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[builder-error-boundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <section className="card mission-panel builder-error-fallback" role="alert">
          <h2>Something went wrong in the builder</h2>
          <p className="muted">
            Your session data is still in the browser. Try continuing below, or reload to start fresh on the home step.
          </p>
          <p className="builder-error-fallback-detail">{this.state.error.message}</p>
          <div className="button-row">
            <button type="button" className="primary-btn" onClick={this.handleRetry}>
              Try again
            </button>
            <button type="button" className="secondary-btn" onClick={this.handleReload}>
              Reload builder
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
