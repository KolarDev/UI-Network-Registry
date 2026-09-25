import { useMemo } from 'react';
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

interface TrackingLookupProps {
    /** Registration returned by GET /api/track/{tracking_id}. */
    data: TrackedRegistration;
    /** Called when the user asks to edit an editable registration. */
    onEdit?: (data: TrackedRegistration) => void;
    onClose?: () => void;
}

/** A registration can be edited until ITEMS marks it completed. */
export function isRegistrationEditable(data: TrackedRegistration): boolean {
    return data.is_editable !== false && data.status !== 'completed';
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

/**
 * Tracking results dashboard. The lookup itself is driven by the single
 * tracking search bar in the global header (app.tsx); this component only
 * renders the result.
 */
export default function TrackingLookup({ data, onEdit, onClose }: TrackingLookupProps) {
    const editable = isRegistrationEditable(data);

    const roleLabel = useMemo(
        () => (data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : ''),
        [data.role],
    );

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Top actions header: tracking id on the left; status + edit/lock on the right */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#2856C3]/10 text-[#2856C3] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Application Tracking</p>
                        <p className="text-base font-mono font-bold text-slate-900 tracking-wider truncate">{data.tracking_id}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {(() => {
                        const meta = getStatusMeta(data.status);
                        return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${meta.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                                {meta.label}
                            </span>
                        );
                    })()}

                    {editable ? (
                        <button
                            type="button"
                            onClick={() => onEdit?.(data)}
                            className="px-4 py-2 bg-[#2856C3] hover:bg-blue-800 text-white text-sm font-bold tracking-wide rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Application
                        </button>
                    ) : (
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border bg-slate-100 text-slate-700 border-slate-300"
                            title="This application has been finalized by ITEMS and can no longer be edited."
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Locked / Finalized
                        </span>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            aria-label="Close tracking results"
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
                    <Field label="Contact Email" value={data.contact_email ?? ''} mono />
                    {data.faculty && <Field label="Faculty / Unit" value={data.faculty} />}
                    {data.department && <Field label="Department" value={data.department} />}
                    <Field label="Username" value={data.username} mono />
                    <Field label="Institutional Email" value={data.email} mono />
                </div>

                {/* Support chat with ITEMS engineers */}
                <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-3">
                        Questions about your application? Message the ITEMS support engineers below. You can attach a JPEG or PNG image (max 5MB).
                    </p>
                    <ChatThread trackingId={data.tracking_id} initialMessages={data.messages} />
                </div>
            </div>
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
