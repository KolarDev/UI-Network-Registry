import './bootstrap';
import '../css/app.css';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import TrackingLookup, { TrackedRegistration } from './components/TrackingLookup';

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
                <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 text-center border-t-8 border-ui-blue">
                    <div className="w-16 h-16 bg-red-100 border border-red-300 text-red-700 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold font-serif text-slate-900">Interface Rendering Error</h1>
                    <p className="text-sm text-slate-650 mt-2 max-w-md mx-auto">
                        The React render tree crashed. This is commonly caused by infinite rendering loops or reading property values of undefined states.
                    </p>
                    <div className="text-left text-xs bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4 max-w-2xl overflow-auto font-mono text-red-750 mx-auto">
                        {this.state.error?.stack || this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2.5 bg-ui-blue hover:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md cursor-pointer"
                    >
                        Reload Interface
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

interface TrackSession {
    trackingId: string;
    data: TrackedRegistration;
}

function App(): React.JSX.Element {
    const [isAdminPath, setIsAdminPath] = useState<boolean>(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
    const [trackSession, setTrackSession] = useState<TrackSession | null>(null);
    const [editingRegistration, setEditingRegistration] = useState<TrackedRegistration | null>(null);
    const [highlightTrackingId, setHighlightTrackingId] = useState<string | null>(null);

    useEffect(() => {
        setIsAdminPath(window.location.pathname === '/ui-admin');
    }, []);

    const handleStartEdit = (data: TrackedRegistration) => {
        setEditingRegistration(data);
    };

    const handleCancelEdit = () => {
        setEditingRegistration(null);
    };

    const handleTrackAnother = () => {
        setTrackSession(null);
        setEditingRegistration(null);
        setHighlightTrackingId(null);
    };

    const onTrackingRegistered = async (trackingId: string) => {
        setHighlightTrackingId(trackingId);
        // Auto-load the dashboard so the user can see status & chat immediately.
        try {
            const resp = await fetch(`/api/track/${encodeURIComponent(trackingId)}`, {
                headers: { Accept: 'application/json' },
            });
            const payload = await resp.json();
            if (resp.ok && payload?.success) {
                setTrackSession({ trackingId, data: payload.registration as TrackedRegistration });
            }
        } catch {
            // Non-fatal: user can still copy the ID and use the header search.
        }
    };

    return (
        <ErrorBoundary>
            <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans">
                {/* Top Banner (Deep Royal Blue) */}
                <div className="w-full h-2 bg-[#2856C3]" />

                {/* Main Header Area */}
                <header className="w-full bg-white border-b border-slate-200/80 shadow-sm py-4 px-6 sm:px-8">
                    <div className="max-w-6xl mx-auto flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src="/images/ui-logo.png"
                                        alt="University of Ibadan Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-lg sm:text-xl font-bold text-slate-950 font-serif leading-tight">
                                        University of Ibadan Network Service Registry
                                    </h1>
                                    <p className="text-xs font-semibold text-ui-gold uppercase tracking-wider">
                                        Information Technology & Media Services (ITMS)
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-slate-600 flex items-center gap-3">
                                <span className="text-slate-500 font-medium">Support:</span>
                                <a href="mailto:network-support@ui.edu.ng" className="hover:underline font-bold text-[#2856C3]">
                                    network-support@ui.edu.ng
                                </a>
                                <span className="text-slate-300">|</span>
                                <span className="font-semibold text-slate-700">Official Portal</span>
                            </div>
                        </div>

                        {/* Header Tracking Bar (only on the user-facing path) */}
                        {!isAdminPath && (
                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2856C3]/10 text-[#2856C3]">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                        </svg>
                                    </span>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Already registered? Track or edit your application below
                                    </p>
                                </div>
                                <TrackingLookup
                                    compact
                                    showDashboard={false}
                                    onEdit={(d) => handleStartEdit(d)}
                                />
                            </div>
                        )}
                    </div>
                </header>

                {/* Main View Render */}
                <main className="w-full flex-grow flex items-start justify-center p-4 sm:p-6 md:p-8 bg-slate-50">
                    <div className="w-full max-w-5xl space-y-6">
                        {isAdminPath ? (
                            isAdminLoggedIn ? (
                                <AdminDashboard />
                            ) : (
                                <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />
                            )
                        ) : editingRegistration ? (
                            <RegistrationForm
                                editRegistration={editingRegistration}
                                onCancelEdit={handleCancelEdit}
                                onEditSaved={() => {
                                    setEditingRegistration(null);
                                    setHighlightTrackingId(editingRegistration.tracking_id);
                                }}
                            />
                        ) : trackSession ? (
                            <>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleTrackAnother}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Register a new staff member
                                    </button>
                                </div>
                                <TrackingLookup
                                    key={trackSession.trackingId}
                                    initialTrackingId={trackSession.trackingId}
                                    prefetched={trackSession}
                                    onEdit={handleStartEdit}
                                    onClose={handleTrackAnother}
                                />
                            </>
                        ) : (
                            <RegistrationForm
                                highlightTrackingId={highlightTrackingId}
                                onTrackingRegistered={onTrackingRegistered}
                            />
                        )}
                    </div>
                </main>

                {/* Academic Portal Footer */}
                <footer className="w-full bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-600">
                    <div className="max-w-6xl mx-auto space-y-2">
                        {/* Thin Pacific Gold Decorative Divider */}
                        <div className="w-24 h-0.5 bg-ui-gold mx-auto mb-4" />
                        <p className="font-bold text-slate-700">
                            © 2026 University of Ibadan Information Technology & Media Services (ITMS). All Rights Reserved.
                        </p>
                        <p className="text-slate-500 max-w-2xl mx-auto">
                            Use of this system is subject to the University of Ibadan IT Policy. Unauthorized access attempt is strictly prohibited and subject to administrative and legal sanctions. ITMS Complex, University of Ibadan, Nigeria.
                        </p>
                    </div>
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