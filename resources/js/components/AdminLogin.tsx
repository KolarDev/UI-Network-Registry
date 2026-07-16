import React, { useState, FormEvent } from 'react';

interface AdminLoginProps {
    onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }

        setIsLoading(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                if (result.token) {
                    sessionStorage.setItem('admin_token', result.token);
                }
                onLoginSuccess();
            } else {
                setError(result.message || 'Invalid administrative credentials. Please try again.');
            }
        } catch (err) {
            setError('A network error occurred. Please verify your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden p-6 sm:p-8 relative">
            {/* Top gold line decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-ui-gold" />
            
            <div className="text-center mb-6 mt-2">
                {/* University Logo */}
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                    <img src="/images/ui-logo.jpg" alt="University of Ibadan Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 tracking-wide">
                    ITMS ADMIN PORTAL
                </h2>
                <p className="text-xs font-bold text-ui-gold uppercase tracking-wider mt-1">
                    Administrative Access Gate
                </p>
            </div>

            {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex gap-2.5 items-start">
                    <svg className="w-5 h-5 text-red-650 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold leading-relaxed">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="admin-username">
                        Username
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            id="admin-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter administrative username"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#2856C3] focus:bg-white focus:ring-1 focus:ring-[#2856C3] transition-all duration-205 text-sm font-semibold"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="admin-password">
                        Password
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            type="password"
                            id="admin-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter administrative password"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#2856C3] focus:bg-white focus:ring-1 focus:ring-[#2856C3] transition-all duration-205 text-sm font-semibold"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 mt-2 bg-[#2856C3] hover:bg-blue-800 text-white rounded-xl text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Verifying...
                        </>
                    ) : (
                        <>
                            Log In to Console
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </>
                    )}
                </button>
            </form>

            <div className="text-center mt-6 text-[10px] text-slate-500 font-semibold">
                Authorized Personnel Only • Session Activity Logged
            </div>
        </div>
    );
}
