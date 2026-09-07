import React from 'react';

interface ImagePreviewModalProps {
    open: boolean;
    src: string | null;
    title?: string;
    description?: string;
    onClose: () => void;
}

export default function ImagePreviewModal({ open, src, title, description, onClose }: ImagePreviewModalProps) {
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open || !src) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="relative max-w-3xl w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50/60">
                    <div className="w-8 h-8 rounded-full bg-[#2856C3]/10 text-[#2856C3] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{title ?? 'Image Preview'}</p>
                        {description && <p className="text-[11px] text-slate-500 truncate">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                        aria-label="Close preview"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="bg-slate-100 flex items-center justify-center p-4 max-h-[70vh] overflow-auto">
                    <img
                        src={src}
                        alt={title ?? 'Preview'}
                        className="max-w-full max-h-[65vh] object-contain rounded-md shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}
