"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { label: string; children: ReactNode };
type State = { error: Error | null };

/** Keeps one broken panel (graph, feed, inspector) from taking down the whole run view. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}] crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex h-full min-h-32 flex-col items-center justify-center gap-2 p-6 text-center text-xs">
        <p className="text-red-300">The {this.props.label} hit an error and was paused.</p>
        <p className="max-w-sm break-words text-muted-foreground">{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })} className="rounded border border-border px-3 py-1 hover:bg-muted">
          Retry
        </button>
      </div>
    );
  }
}
