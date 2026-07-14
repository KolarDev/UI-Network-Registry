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

        // Simulate a brief authentication network lag for realism & polish
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (username === 'admin' && password === 'admin123') {
            setIsLoading(false);
            onLoginSuccess();
        } else {
            setIsLoading(false);
            setError('Invalid administrative credentials. Please try again.');
        }
    };

    return (
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 relative">
            {/* Top gold line decoration */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-ui-blue to-ui-gold" />
            
            <div className="text-center mb-6 mt-2">
                {/* Academic Shield / Lock SVG Icon */}
                <div className="w-16 h-16 bg-ui-blue/5 border border-ui-blue/20 text-ui-blue rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-4">
                    <svg className="w-8 h-8 text-ui-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold font-serif text-slate-800 tracking-wide">
                    ADMIN GATEWAY
                </h2>
                <p className="text-xs font-semibold text-ui-gold uppercase tracking-widest mt-1">
                    ITMS Network Registry Console
                </p>
            </div>

            {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-705 rounded-xl flex gap-2.5 items-start animate-fadeIn">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium leading-relaxed text-red-650">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="admin-username">
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
                            placeholder="Enter username"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ui-blue focus:bg-white focus:ring-2 focus:ring-ui-blue/20 transition-all duration-200 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="admin-password">
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
                            placeholder="Enter password"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ui-blue focus:bg-white focus:ring-2 focus:ring-ui-blue/20 transition-all duration-200 text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-ui-blue to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl text-sm font-bold tracking-wide shadow-md shadow-ui-blue/10 hover:shadow-ui-blue/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Authenticating Console...
                        </>
                    ) : (
                        <>
                            Verify Credentials
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </>
                    )}
                </button>
            </form>

            <div className="text-center mt-6 text-[10px] text-slate-400 font-medium">
                Authorized Personnel Only • IP Logged for Auditing
            </div>
        </div>
    );
}
