import './bootstrap';
import '../css/app.css';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';

// ==========================================
// Safe React Error Boundary Component
// ==========================================
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught rendering error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold font-serif text-slate-200">Interface Rendering Error</h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        The React render tree crashed. This is commonly caused by infinite rendering loops or reading property values of undefined states.
                    </p>
                    <div className="text-left text-xs bg-slate-900 border border-slate-800 p-4 rounded-xl mt-4 max-w-2xl overflow-auto font-mono text-red-400 mx-auto">
                        {this.state.error?.stack || this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2.5 bg-gradient-to-r from-ui-blue to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md shadow-ui-blue/20 cursor-pointer"
                    >
                        Reload Interface
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function App(): React.JSX.Element {
    const [view, setView] = useState<'staff' | 'admin'>('staff');

    return (
        <ErrorBoundary>
            <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 relative overflow-x-hidden">
                {/* Ambient Background Glowing Orbs */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-ui-blue/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-ui-gold/5 rounded-full blur-[140px] pointer-events-none translate-y-1/3" />
                
                {/* Top Bar Navigation */}
                <header className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 z-10 border-b border-slate-900 pb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            ITMS Network Portal
                        </span>
                    </div>

                    {/* Navigation Tab Toggles */}
                    <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
                        <button
                            type="button"
                            onClick={() => setView('staff')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                view === 'staff'
                                    ? 'bg-ui-blue text-white shadow-md shadow-ui-blue/15'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            Staff Form
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('admin')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                view === 'admin'
                                    ? 'bg-ui-gold text-slate-950 shadow-md shadow-ui-gold/15'
                                    : 'text-slate-455 hover:text-slate-200'
                            }`}
                        >
                            Admin Portal
                        </button>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-4 hidden sm:flex">
                        <a href="mailto:network-support@ui.edu.ng" className="hover:text-ui-gold transition-colors duration-150">
                            Support
                        </a>
                        <span className="text-slate-700">|</span>
                        <span>v2.1.0</span>
                    </div>
                </header>

                {/* Main View Render wrapped in ErrorBoundary */}
                <main className="w-full flex-grow flex items-center justify-center z-10 mb-12">
                    {view === 'staff' ? <RegistrationForm /> : <AdminDashboard />}
                </main>

                {/* Academic Portal Footer */}
                <footer className="w-full max-w-6xl text-center border-t border-slate-900 pt-6 mt-4 text-xs text-slate-500 z-10 space-y-2">
                    <p>
                        © 2026 University of Ibadan Information Technology & Media Services (ITMS). All Rights Reserved.
                    </p>
                    <p className="text-slate-600">
                        For system inquiries or network issues, please email{' '}
                        <a href="mailto:network-support@ui.edu.ng" className="text-ui-blue hover:text-blue-450 transition-colors font-medium">
                            network-support@ui.edu.ng
                        </a>{' '}
                        or visit the ITMS Complex, University of Ibadan.
                    </p>
                </footer>
            </div>
        </ErrorBoundary>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}