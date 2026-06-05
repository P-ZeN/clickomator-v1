import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level error boundary. Without this, a single render/cleanup throw (e.g. a
 * stale ref during unmount) tears down the whole React tree and leaves a blank
 * screen. This catches it and shows a recoverable fallback instead.
 */
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleGoHome = () => {
    // Hard navigation guarantees a clean remount of the whole app.
    window.location.assign(import.meta.env.VITE_BASE_PATH || '/')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className='min-h-dvh w-full flex items-center justify-center bg-gray-950 text-white p-6'>
        <div className='max-w-md w-full text-center bg-black bg-opacity-90 border border-gray-700 rounded-lg p-6 shadow-xl'>
          <h1 className='text-xl font-bold mb-2'>Une erreur est survenue</h1>
          <p className='text-sm text-gray-400 mb-4'>
            L'application a rencontré un problème inattendu. Vous pouvez réessayer
            ou revenir à l'accueil.
          </p>
          {this.state.error?.message && (
            <pre className='text-xs text-red-300 bg-gray-900 rounded p-2 mb-4 overflow-x-auto text-left whitespace-pre-wrap'>
              {this.state.error.message}
            </pre>
          )}
          <div className='flex gap-2 justify-center'>
            <Button
              onClick={this.handleReset}
              className='bg-green-600 hover:bg-green-700'
            >
              Réessayer
            </Button>
            <Button
              variant='outline'
              onClick={this.handleGoHome}
              className='text-white border-white bg-gray-950 hover:bg-gray-700'
            >
              Accueil
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
