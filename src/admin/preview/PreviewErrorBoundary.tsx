import { Component, type ReactNode } from 'react'

interface Props {
  /** When this changes after a failure, rendering is retried. */
  resetKey: unknown
  children: ReactNode
  fallback: ReactNode
}

/** Shows `fallback` (the last render that worked) when a draft fails to render. */
export class PreviewErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
