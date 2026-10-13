import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="boot-fallback">
          <p>LEO LADIPO / SOFTWARE ENGINEER</p>
          <h1>Let’s try that again.</h1>
          <p>
            The interactive portfolio couldn’t finish loading. You can reload
            it, read my résumé, or get in touch directly.
          </p>
          <div className="boot-links">
            <button onClick={() => window.location.reload()}>
              Reload portfolio ↗
            </button>
            <a href="/Leo-Ladipo-Resume.pdf">Read my résumé ↗</a>
            <a href="mailto:L.ladipo@hotmail.com">Email Leo ↗</a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
