export type RegistrationStatus = 'pending' | 'in_review' | 'completed';

export interface StatusStep {
    key: RegistrationStatus;
    label: string;
    description: string;
}

export const STATUS_STEPS: StatusStep[] = [
    { key: 'pending', label: 'Pending', description: 'Submitted & awaiting initial review.' },
    { key: 'in_review', label: 'In Review', description: 'ITMS is reviewing your documents.' },
    { key: 'completed', label: 'Completed', description: 'Verified & finalized by ITMS.' },
];

const ORDER: Record<RegistrationStatus, number> = {
    pending: 0,
    in_review: 1,
    completed: 2,
};

export function getStatusMeta(status: string): { label: string; badgeClass: string; dotClass: string } {
    switch (status) {
        case 'in_review':
            return {
                label: 'In Review',
                badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
                dotClass: 'bg-blue-600',
            };
        case 'completed':
            return {
                label: 'Completed',
                badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dotClass: 'bg-emerald-600',
            };
        case 'pending':
        default:
            return {
                label: 'Pending',
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
                dotClass: 'bg-amber-500',
            };
    }
}

export default function StatusTimeline({ status }: { status: string }) {
    const activeIndex = ORDER[(status as RegistrationStatus)] ?? 0;
    const meta = getStatusMeta(status);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${meta.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                    {meta.label}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                    Current stage in your application review
                </span>
            </div>

            <ol className="relative flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-stretch">
                {STATUS_STEPS.map((step, idx) => {
                    const stepIndex = ORDER[step.key];
                    const isCompleted = stepIndex < activeIndex || status === 'completed';
                    const isActive = stepIndex === activeIndex && status !== 'completed';
                    const isFinal = step.key === 'completed' && status === 'completed';

                    return (
                        <li
                            key={step.key}
                            className="flex-1 flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 relative"
                        >
                            {/* connector line on sm+ */}
                            {idx < STATUS_STEPS.length - 1 && (
                                <div
                                    aria-hidden="true"
                                    className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 ${
                                        stepIndex < activeIndex ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                />
                            )}

                            <div
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                    isCompleted || isFinal
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                        : isActive
                                        ? 'bg-white border-ui-gold text-ui-gold shadow-sm scale-110'
                                        : 'bg-white border-slate-200 text-slate-400'
                                }`}
                            >
                                {isCompleted || isFinal ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    idx + 1
                                )}
                            </div>

                            <div className="sm:text-center sm:mt-2">
                                <p
                                    className={`text-xs font-bold uppercase tracking-wider ${
                                        isCompleted || isFinal
                                            ? 'text-emerald-700'
                                            : isActive
                                            ? 'text-ui-gold'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    {step.label}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[160px] sm:mx-auto leading-snug">
                                    {step.description}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
