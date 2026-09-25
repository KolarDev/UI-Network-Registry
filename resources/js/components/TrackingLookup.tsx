import React, { useEffect, useMemo, useState } from 'react';
import StatusTimeline, { getStatusMeta } from './StatusTimeline';
import ChatThread, { ChatMessage } from './ChatThread';

export interface TrackedRegistration {
    id: number;
    tracking_id: string;
    status: string;
    is_editable: boolean;
    full_name: string;
    staff_id: string;
    role: string;
    designation: string | null;
    phone: string;
    contact_email: string | null;
    faculty: string | null;
    department: string | null;
    username: string;
    email: string;
    salary_deduction_authorized: boolean;
    submitted_at: string | null;
    staff_id_file_url: string | null;
    payslip_file_url: string | null;
    messages: ChatMessage[];
}

type LookupState =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'found'; data: TrackedRegistration };

interface TrackingLookupProps {
    /** Optional initial value to use (e.g., from URL ?track=...). */
    initialTrackingId?: string;
    /** Optional pre-fetched data, used after a fresh registration. */
    prefetched?: { trackingId: string; data: TrackedRegistration } | null;
    /** If provided, rendered when the registration is editable. */
    onEdit?: (data: TrackedRegistration) => void;
    /** Compact mode: hides dashboard panel & only shows the search bar. */
    compact?: boolean;
    /** When true, render the dashboard panel (auto-shown when not compact). */
    showDashboard?: boolean;
    onClose?: () => void;
}

export function lookupRegistration(trackingId: string): Promise<TrackedRegistration> {
    return fetch(`/api/track/${encodeURIComponent(trackingId)}`, {
        headers: { Accept: 'application/json' },
    }).then(async (resp) => {
        let payload: any = null;
        try {
            payload = await resp.json();
        } catch {
            throw new Error(`Server returned an invalid response (HTTP ${resp.status}).`);
        }
        if (!resp.ok || !payload?.success) {
            throw new Error(payload?.message || `Lookup failed (HTTP ${resp.status}).`);
        }
        return payload.registration as TrackedRegistration;
    });
}

export default function TrackingLookup({
    initialTrackingId,
    prefetched,
    onEdit,
    compact = false,
    showDashboard = true,
    onClose,
}: TrackingLookupProps) {
    const [trackingId, setTrackingId] = useState<string>(initialTrackingId ?? '');
    const [state, setState] = useState<LookupState>({ kind: 'idle' });

    const fetchById = async (id: string) => {
        const cleaned = id.trim();
        if (!cleaned) {
            setState({ kind: 'error', message: 'Please enter a Tracking ID.' });
            return;
        }
        setState({ kind: 'loading' });
        try {
            const data = await lookupRegistration(cleaned);
            setState({ kind: 'found', data });
        } catch (err: any) {
            setState({ kind: 'error', message: err?.message || 'Lookup failed.' });
        }
    };

    // If a prefetched payload is provided, use it immediately.
    useEffect(() => {
        if (prefetched) {
            setTrackingId(prefetched.trackingId);
            setState({ kind: 'found', data: prefetched.data });
        }
    }, [prefetched]);

    // If an initial tracking id is given, kick off a lookup.
    useEffect(() => {
        if (initialTrackingId && !prefetched) {
            fetchById(initialTrackingId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchById(trackingId);
    };

    const handleClear = () => {
        setTrackingId('');
        setState({ kind: 'idle' });
        onClose?.();
    };

    const data = state.kind === 'found' ? state.data : null;

    const roleLabel = useMemo(() => {
        if (!data) return '';
        return data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : '';
    }, [data]);

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <form
                onSubmit={handleSubmit}
                className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3"
            >
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="Enter Tracking ID (e.g. UIN-7X9B2K)"
                        className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-wider text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2856C3]/20 focus:border-[#2856C3] focus:bg-white transition-all"
                        aria-label="Tracking ID"
                        maxLength={32}
                    />
                    {trackingId && (
                        <button
                            type="button"
                            onClick={() => setTrackingId('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
                            aria-label="Clear"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={state.kind === 'loading'}
                    className="px-5 py-2.5 bg-[#2856C3] hover:bg-blue-800 text-white text-sm font-bold tracking-wide rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-w-[140px]"
                >
                    {state.kind === 'loading' ? (
                        <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Searching...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            Track Application
                        </>
                    )}
                </button>
            </form>

            {compact && !showDashboard && null}

            {showDashboard && state.kind === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                    <div className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1 text-sm">
                        <p className="font-semibold">Tracking lookup failed</p>
                        <p className="text-xs mt-0.5 text-red-700">{state.message}</p>
                    </div>
                </div>
            )}

            {showDashboard && data && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Top bar: Tracking id + status pill */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#2856C3]/10 text-[#2856C3] flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Application Tracking</p>
                                <p className="text-base font-mono font-bold text-slate-900 tracking-wider">{data.tracking_id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {(() => {
                                const meta = getStatusMeta(data.status);
                                return (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${meta.badgeClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                        {meta.label}
                                    </span>
                                );
                            })()}

                            {data.is_editable ? (
                                <button
                                    type="button"
                                    onClick={() => onEdit?.(data)}
                                    className="px-3.5 py-1.5 bg-[#2856C3] hover:bg-blue-800 text-white text-xs font-bold tracking-wide rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Application
                                </button>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Locked
                                </span>
                            )}

                            {onClose && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    aria-label="Close"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-6">
                        <StatusTimeline status={data.status} />

                        {/* Profile summary grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <Field label="Full Name" value={data.full_name} />
                            <Field label="Staff ID" value={data.staff_id} mono />
                            <Field label="Institutional Role" value={roleLabel} />
                            {data.designation && <Field label="Designation" value={data.designation} />}
                            <Field label="Phone" value={data.phone} mono />
                            {data.faculty && <Field label="Faculty / Unit" value={data.faculty} />}
                            {data.department && <Field label="Department" value={data.department} />}
                            <Field label="Username" value={`@${data.username}`} mono />
                            <Field label="Email" value={data.email} mono />
                        </div>

                        {/* Chat thread */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Conversation with ITMS
                            </h4>
                            <ChatThread trackingId={data.tracking_id} initialMessages={data.messages} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            <span className={`text-sm text-slate-800 font-semibold ${mono ? 'font-mono' : ''} break-words`}>{value || '—'}</span>
        </div>
    );
}
