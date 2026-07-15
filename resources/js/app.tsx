import './bootstrap';
import '../css/app.css';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

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

    useEffect(() => {
        setIsAdminPath(window.location.pathname === '/ui-admin');
    }, []);

    return (
        <ErrorBoundary>
            <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between relative overflow-x-hidden font-sans">
                {/* Top Banner (Deep Royal Blue) */}
                <div className="w-full h-2 bg-ui-blue" />
                
                {/* Main Header Area */}
                <header className="w-full bg-white border-b border-slate-200/80 shadow-sm py-4 px-6 sm:px-8">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Simple Academic Logo Accent */}
                            <div className="w-12 h-12 bg-ui-blue text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-md border-b-4 border-ui-gold">
                                UI
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-slate-950 font-serif leading-tight">
                                    UNIVERSITY OF IBADAN
                                </h1>
                                <p className="text-xs font-semibold text-ui-gold uppercase tracking-wider">
                                    ITMS Staff Network Registry Portal
                                </p>
                            </div>
                        </div>
                        
                        <div className="text-xs text-slate-600 flex items-center gap-4">
                            <a href="mailto:network-support@ui.edu.ng" className="hover:underline font-semibold text-ui-blue">
                                network-support@ui.edu.ng
                            </a>
                            <span className="text-slate-300">|</span>
                            <span className="font-semibold text-slate-700">Official Portal</span>
                        </div>
                    </div>
                </header>

                {/* Main View Render */}
                <main className="w-full flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-50">
                    <div className="w-full max-w-6xl flex justify-center items-center">
                        {isAdminPath ? (
                            isAdminLoggedIn ? (
                                <AdminDashboard />
                            ) : (
                                <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />
                            )
                        ) : (
                            <RegistrationForm />
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