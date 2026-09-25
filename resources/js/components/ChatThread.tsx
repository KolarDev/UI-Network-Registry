import React, { useEffect, useRef, useState } from 'react';
import { IMAGE_ACCEPT, validateImageFile } from '../utils/imageUpload';
import { adminHeaders } from '../utils/adminAuth';

export interface ChatMessage {
    id: number;
    sender_type: 'user' | 'admin';
    message: string;
    attachment_url: string | null;
    created_at: string | null;
}

interface ChatThreadProps {
    trackingId: string;
    initialMessages: ChatMessage[];
    /**
     * Viewer perspective. Admin view: admin messages on the right, requester on
     * the left. User view (default): the user's own messages on the right,
     * ITEMS support on the left.
     */
    isAdminView?: boolean;
    /** Staff member's name, shown as "Requester (<name>)" in the admin view. */
    requesterName?: string;
}

function formatTime(iso: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

function senderLabel(senderType: ChatMessage['sender_type'], isAdminView: boolean, requesterName?: string): string {
    if (isAdminView) {
        if (senderType === 'admin') return 'ITEMS Admin';
        const name = requesterName?.trim();
        return name ? `Requester (${name})` : 'Requester';
    }
    return senderType === 'admin' ? 'ITEMS Support Team' : 'You';
}

export default function ChatThread({ trackingId, initialMessages, isAdminView = false, requesterName }: ChatThreadProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [draft, setDraft] = useState<string>('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!attachment) {
            setAttachmentPreview(null);
            return;
        }
        const url = URL.createObjectURL(attachment);
        setAttachmentPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [attachment]);

    /** Validate an attachment the moment it is picked or dropped. */
    const acceptAttachment = (file: File | null) => {
        if (!file) return;
        const validationError = validateImageFile(file);
        if (validationError) {
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setError(validationError);
            return;
        }
        setError(null);
        setAttachment(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() && !attachment) return;

        setSending(true);
        setError(null);

        try {
            const fd = new FormData();
            if (draft.trim()) fd.append('message', draft.trim());
            if (attachment) fd.append('attachment', attachment);

            // The endpoint decides the stored sender_type: the admin route
            // stores "admin", the public tracking route stores "user".
            const endpoint = isAdminView
                ? `/api/admin/track/${encodeURIComponent(trackingId)}/messages`
                : `/api/track/${encodeURIComponent(trackingId)}/messages`;
            const resp = await fetch(endpoint, {
                method: 'POST',
                body: fd,
                headers: isAdminView ? adminHeaders() : { Accept: 'application/json' },
            });

            let result: any = null;
            try {
                result = await resp.json();
            } catch {
                throw new Error(`Server returned an invalid response (HTTP ${resp.status}).`);
            }

            if (!resp.ok || !result?.success) {
                throw new Error(result?.message || 'Failed to post message.');
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: result.data.id,
                    sender_type: result.data.sender_type,
                    message: result.data.message,
                    attachment_url: result.data.attachment_url,
                    created_at: result.data.created_at,
                },
            ]);
            setDraft('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            setError(err?.message || 'Failed to post message.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[28rem] overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2856C3]/10 text-[#2856C3] flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.395-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                        {isAdminView
                            ? `Conversation with ${requesterName?.trim() || 'Requester'}`
                            : 'Conversation with ITEMS Support Team'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Reference: {trackingId}
                    </p>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{messages.length} message{messages.length === 1 ? '' : 's'}</span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-slate-50/30"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 px-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.395-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            {isAdminView
                                ? 'Send a message to the requester about this application.'
                                : 'Start a conversation with the ITEMS Network Unit. Replies typically arrive within 1 business day.'}
                        </p>
                    </div>
                )}

                {messages.map((m) => {
                    // "Self" = the viewer's own side: rendered on the right in brand blue.
                    const fromSelf = isAdminView ? m.sender_type === 'admin' : m.sender_type === 'user';
                    return (
                        <div
                            key={m.id}
                            className={`flex ${fromSelf ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${fromSelf ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    {senderLabel(m.sender_type, isAdminView, requesterName)}
                                </span>
                                <div
                                    className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
                                        fromSelf
                                            ? 'bg-blue-600 text-white rounded-br-md'
                                            : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-bl-md'
                                    }`}
                                >
                                    {m.message && <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>}
                                    {m.attachment_url && (
                                        <a
                                            href={m.attachment_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                                                fromSelf
                                                    ? 'bg-white/15 text-white hover:bg-white/25'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 008.486 8.486L20.5 13" />
                                            </svg>
                                            View attachment
                                        </a>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 font-medium">
                                    {formatTime(m.created_at)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Composer */}
            <form
                onSubmit={handleSubmit}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!sending) acceptAttachment(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`border-t border-slate-200 p-3 sm:p-4 space-y-2 transition-colors ${
                    isDragOver ? 'bg-blue-50/60 ring-2 ring-inset ring-[#2856C3]/30' : 'bg-white'
                }`}
            >
                {attachmentPreview && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <img
                            src={attachmentPreview}
                            alt="Attachment preview"
                            className="w-12 h-12 object-cover rounded-md border border-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{attachment?.name}</p>
                            <p className="text-[10px] text-slate-500">
                                {attachment ? `${(attachment.size / 1024).toFixed(0)} KB` : ''}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setAttachment(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            aria-label="Remove attachment"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
                        {error}
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={IMAGE_ACCEPT}
                        onChange={(e) => acceptAttachment(e.target.files?.[0] ?? null)}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending}
                        className="flex-shrink-0 w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:text-[#2856C3] hover:border-[#2856C3]/40 hover:bg-blue-50/30 transition-colors disabled:opacity-50 flex items-center justify-center"
                        aria-label="Attach image"
                        title="Attach image (JPEG/PNG, max 5MB)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 008.486 8.486L20.5 13" />
                        </svg>
                    </button>

                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as unknown as React.FormEvent);
                            }
                        }}
                        rows={1}
                        placeholder="Type your message..."
                        disabled={sending}
                        className="flex-1 resize-none max-h-24 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2856C3]/20 focus:border-[#2856C3] focus:bg-white transition-all placeholder-slate-400 disabled:opacity-50"
                    />

                    <button
                        type="submit"
                        disabled={sending || (!draft.trim() && !attachment)}
                        className="flex-shrink-0 px-4 h-10 rounded-xl bg-[#2856C3] hover:bg-blue-800 text-white text-xs font-bold tracking-wide shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {sending ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
