import './bootstrap';
import '../css/app.css';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import TrackingLookup, { TrackedRegistration, isRegistrationEditable, lookupRegistration } from './components/TrackingLookup';

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

function App(): React.JSX.Element {
    const [isAdminPath, setIsAdminPath] = useState<boolean>(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
    const [trackedRegistration, setTrackedRegistration] = useState<TrackedRegistration | null>(null);
    const [editingRegistration, setEditingRegistration] = useState<TrackedRegistration | null>(null);

    // Header tracking search (the only tracking search bar in the app).
    const [trackingQuery, setTrackingQuery] = useState<string>('');
    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
    const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

    useEffect(() => {
        setIsAdminPath(window.location.pathname === '/ui-admin');
    }, []);

    // Mobile drawer: close on Escape or when resized up to the desktop layout,
    // and stop the page behind it from scrolling while open.
    useEffect(() => {
        if (!mobileNavOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileNavOpen(false);
        };
        const desktop = window.matchMedia('(min-width: 768px)');
        const onResize = () => {
            if (desktop.matches) setMobileNavOpen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        desktop.addEventListener('change', onResize);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
            desktop.removeEventListener('change', onResize);
        };
    }, [mobileNavOpen]);

    /**
     * Fetch GET /api/track/{id} and switch the main view to the results
     * dashboard. On failure the current view is kept and the error is shown
     * beneath the header. Resolves to whether the lookup succeeded.
     */
    const trackApplication = async (rawId: string, notice: string | null = null): Promise<boolean> => {
        const trackingId = rawId.trim().toUpperCase();
        if (!trackingId) {
            setTrackingError('Please enter a Tracking ID (e.g. UIN-7X9B2K).');
            return false;
        }

        setIsTracking(true);
        setTrackingError(null);
        try {
            const data = await lookupRegistration(trackingId);
            setTrackedRegistration(data);
            setEditingRegistration(null);
            setTrackingQuery(data.tracking_id);
            setTrackingNotice(notice);
            setMobileNavOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        } catch (err: any) {
            setTrackingError(err?.message || 'Tracking lookup failed. Please try again.');
            return false;
        } finally {
            setIsTracking(false);
        }
    };

    const handleTrackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        trackApplication(trackingQuery);
    };

    const handleStartEdit = (data: TrackedRegistration) => {
        // The dashboard hides the button for finalized applications; guard here too.
        if (!isRegistrationEditable(data)) return;
        setTrackingNotice(null);
        setEditingRegistration(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingRegistration(null);
    };

    const handleEditSaved = async () => {
        const trackingId = editingRegistration?.tracking_id;
        if (!trackingId) return;
        // Reload so the dashboard reflects the saved changes.
        const ok = await trackApplication(trackingId, 'Your application was updated successfully.');
        if (!ok) {
            // Fall back to the last loaded dashboard; the header shows the error.
            setEditingRegistration(null);
        }
    };

    const handleCloseTracking = () => {
        setTrackedRegistration(null);
        setEditingRegistration(null);
        setTrackingError(null);
        setTrackingNotice(null);
        setTrackingQuery('');
    };

    // Invoked only from the success screen's "Go to Tracking Page" button.
    // On failure the success screen stays up and the header shows the error.
    const handleGoToTracking = (trackingId: string) => {
        trackApplication(trackingId);
    };

    const handleNewRegistration = () => {
        handleCloseTracking();
        setMobileNavOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /**
     * The tracking search form. Rendered inline in the desktop header and
     * inside the mobile drawer; both share the same state.
     */
    const renderTrackingForm = (variant: 'desktop' | 'drawer') => (
        <form
            onSubmit={handleTrackSubmit}
            className={variant === 'desktop' ? 'flex items-center gap-2 w-full' : 'flex flex-col gap-2.5 w-full'}
            role="search"
            aria-label="Track an application"
        >
            <div className="flex-1 relative min-w-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                    type="text"
                    value={trackingQuery}
                    onChange={(e) => {
                        setTrackingQuery(e.target.value);
                        if (trackingError) setTrackingError(null);
                    }}
                    placeholder={variant === 'desktop' ? 'Tracking ID (e.g. UIN-7X9B2K)' : 'Enter Tracking ID (e.g. UIN-7X9B2K)'}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-800 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2856C3]/20 focus:border-[#2856C3] focus:bg-white transition-all"
                    aria-label="Tracking ID"
                    aria-invalid={!!trackingError}
                    aria-describedby={trackingError ? `tracking-error-${variant}` : undefined}
                    maxLength={32}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                />
                {trackingQuery && (
                    <button
                        type="button"
                        onClick={() => {
                            setTrackingQuery('');
                            setTrackingError(null);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
                        aria-label="Clear tracking ID"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            {variant === 'drawer' && trackingError && (
                <p id="tracking-error-drawer" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                    {trackingError}
                </p>
            )}
            <button
                type="submit"
                disabled={isTracking}
                className={`px-5 py-2.5 bg-[#2856C3] hover:bg-blue-800 text-white text-sm font-bold tracking-wide rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 flex-shrink-0 ${
                    variant === 'drawer' ? 'w-full' : ''
                }`}
            >
                {isTracking ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Tracking...
                    </>
                ) : (
                    'Track'
                )}
            </button>
        </form>
    );

    return (
        <ErrorBoundary>
            <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans">
                {/* Top navigation bar */}
                <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
                    <div className="h-1 w-full bg-[#2856C3]" />
                    <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
                        {/* Brand */}
                        <a
                            href={isAdminPath ? '/ui-admin' : '/'}
                            onClick={(e) => {
                                if (!isAdminPath) {
                                    e.preventDefault();
                                    handleNewRegistration();
                                }
                            }}
                            className="flex items-center gap-2.5 sm:gap-3 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2856C3]/40"
                        >
                            <img
                                src="/images/ui-logo.png"
                                alt="University of Ibadan seal"
                                className="w-10 h-10 flex-shrink-0 object-contain"
                            />
                            <span className="min-w-0">
                                <span className="block text-base sm:text-lg font-bold text-slate-950 font-serif leading-tight truncate">
                                    ITEMS Network Registry
                                </span>
                                <span className="block text-[10px] sm:text-[11px] font-semibold text-ui-gold uppercase tracking-wider truncate">
                                    University of Ibadan
                                </span>
                            </span>
                        </a>

                        {isAdminPath ? (
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full bg-[#2856C3]/10 text-[#2856C3] border border-[#2856C3]/20">
                                Administrative Console
                            </span>
                        ) : (
                            <>
                                {/* Desktop: inline search + actions */}
                                <div className="hidden md:flex items-center gap-3 flex-1 justify-end min-w-0">
                                    <div className="w-full max-w-md">{renderTrackingForm('desktop')}</div>
                                    {(trackedRegistration || editingRegistration) && (
                                        <button
                                            type="button"
                                            onClick={handleNewRegistration}
                                            className="px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            New Registration
                                        </button>
                                    )}
                                    <a
                                        href="mailto:network-support@ui.edu.ng"
                                        className="p-2.5 text-slate-500 hover:text-[#2856C3] hover:bg-slate-100 rounded-xl transition-colors"
                                        title="Email ITEMS network support"
                                        aria-label="Email ITEMS network support"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </a>
                                </div>

                                {/* Mobile: hamburger */}
                                <button
                                    type="button"
                                    onClick={() => setMobileNavOpen(true)}
                                    className="md:hidden p-2.5 -mr-1 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                    aria-label="Open menu"
                                    aria-expanded={mobileNavOpen}
                                    aria-controls="mobile-nav"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Mobile slide-over drawer (always mounted so it can animate; invisible when closed) */}
                {!isAdminPath && (
                    <div
                        className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
                            mobileNavOpen ? 'visible' : 'invisible'
                        }`}
                    >
                        <div
                            className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
                                mobileNavOpen ? 'opacity-100' : 'opacity-0'
                            }`}
                            onClick={() => setMobileNavOpen(false)}
                            aria-hidden="true"
                        />
                        <nav
                            id="mobile-nav"
                            aria-label="Main menu"
                            className={`absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                                mobileNavOpen ? 'translate-x-0' : 'translate-x-full'
                            }`}
                        >
                            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
                                <span className="text-sm font-bold text-slate-900">Menu</span>
                                <button
                                    type="button"
                                    onClick={() => setMobileNavOpen(false)}
                                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                                    aria-label="Close menu"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <section className="space-y-2">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Track your application
                                    </h2>
                                    {renderTrackingForm('drawer')}
                                </section>
                                <section className="space-y-2">
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Actions</h2>
                                    <button
                                        type="button"
                                        onClick={handleNewRegistration}
                                        className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                                    >
                                        New Registration
                                    </button>
                                    <a
                                        href="mailto:network-support@ui.edu.ng"
                                        className="block w-full px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                                    >
                                        Email support
                                        <span className="block text-xs font-normal text-[#2856C3] mt-0.5 break-all">network-support@ui.edu.ng</span>
                                    </a>
                                </section>
                            </div>
                        </nav>
                    </div>
                )}

                {/* Tracking lookup error (e.g. unknown ID / 404), shown beneath the header.
                    While the mobile drawer is open the error is shown inside it instead. */}
                {!isAdminPath && trackingError && !mobileNavOpen && (
                    <div className="w-full bg-red-50 border-b border-red-200 px-6 sm:px-8 py-3" role="alert" id="tracking-error-desktop">
                        <div className="max-w-6xl mx-auto flex items-start gap-3 text-red-800">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1 text-sm">
                                <p className="font-semibold">Tracking lookup failed</p>
                                <p className="text-xs mt-0.5 text-red-700">{trackingError}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTrackingError(null)}
                                className="text-red-400 hover:text-red-700 p-1 rounded"
                                aria-label="Dismiss"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Main View Render */}
                <main className="w-full flex-grow flex items-start justify-center p-4 sm:p-6 md:p-8 bg-slate-50">
                    <div className={`w-full space-y-6 ${isAdminPath && isAdminLoggedIn ? 'max-w-7xl' : 'max-w-5xl'}`}>
                        {isAdminPath ? (
                            isAdminLoggedIn ? (
                                <AdminDashboard onLogout={() => setIsAdminLoggedIn(false)} />
                            ) : (
                                <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />
                            )
                        ) : editingRegistration ? (
                            <RegistrationForm
                                editRegistration={editingRegistration}
                                onCancelEdit={handleCancelEdit}
                                onEditSaved={handleEditSaved}
                            />
                        ) : trackedRegistration ? (
                            <>
                                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                                    {trackingNotice ? (
                                        <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2" role="status">
                                            {trackingNotice}
                                        </p>
                                    ) : (
                                        <span />
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleCloseTracking}
                                        className="self-end px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Register a new staff member
                                    </button>
                                </div>
                                <TrackingLookup
                                    key={trackedRegistration.tracking_id}
                                    data={trackedRegistration}
                                    onEdit={handleStartEdit}
                                    onClose={handleCloseTracking}
                                />
                            </>
                        ) : (
                            <RegistrationForm
                                onGoToTracking={handleGoToTracking}
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
                            © 2026 University of Ibadan Information Technology and Media Services (ITEMS). All Rights Reserved.
                        </p>
                        <p className="text-slate-500 max-w-2xl mx-auto">
                            Use of this system is subject to the University of Ibadan IT Policy. Unauthorized access attempt is strictly prohibited and subject to administrative and legal sanctions. ITEMS Complex, University of Ibadan, Nigeria.
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