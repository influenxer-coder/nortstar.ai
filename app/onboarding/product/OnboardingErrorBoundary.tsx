'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[NorthStar] Onboarding render error:', error.message)
    console.error('[NorthStar] Component stack:', info.componentStack)
    console.error('[NorthStar] Full error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
          <div className="max-w-lg w-full rounded-xl border border-red-900/50 bg-red-950/20 p-6">
            <p className="text-sm font-semibold text-red-400 mb-2">Something went wrong</p>
            <p className="text-xs text-red-300/70 font-mono break-all">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 rounded-lg text-xs border border-red-900/50 text-red-400 hover:text-red-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
