import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/** Catches render errors anywhere in the routed app shell. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[app-error-boundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.assign("/");
  };

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="page-shell page-shell--layered">
          <section className="card mission-panel builder-error-fallback app-error-fallback" role="alert">
            <h2>Something went wrong</h2>
            <p className="muted">
              The app hit an unexpected error. Your saved session may still be in the browser—try again or reload the home page.
            </p>
            <p className="builder-error-fallback-detail">{this.state.error.message}</p>
            <div className="button-row">
              <button type="button" className="primary-btn" onClick={this.handleRetry}>
                Try again
              </button>
              <button type="button" className="secondary-btn" onClick={this.handleReload}>
                Reload app
              </button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
