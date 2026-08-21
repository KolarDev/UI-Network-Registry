import React, { useState, useEffect } from 'react';

// ==========================================
// 1. TypeScript Interfaces
// ==========================================
export interface SubmissionRecord {
    id: string;
    fullName: string;
    staffId: string;
    role: 'staff' | 'dean' | 'hod' | 'director';
    designation?: 'Academic' | 'Non-Teaching' | '';
    phone: string;
    faculty: string;
    department: string;
    username: string;
    salaryDeductionAuthorized: boolean;
    staffIdFileName: string;
    payslipFileName: string;
    submittedAt: string;
    staffIdFilePath?: string;
    payslipFilePath?: string;
    defaultPasswordText?: string;
}

export default function AdminDashboard() {
    // ==========================================
    // 3. State Management
    // ==========================================
    const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [searchName, setSearchName] = useState<string>('');
    const [searchStaffId, setSearchStaffId] = useState<string>('');
    const [searchDept, setSearchDept] = useState<string>('');
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Document Preview State
    const [previewDoc, setPreviewDoc] = useState<{
        title: string;
        fileName: string;
        filePath: string;
        isPdf: boolean;
    } | null>(null);

    const itemsPerPage = 10;

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    // ==========================================
    // 4. Data Fetching Logic (with SQLite connection)
    // ==========================================
    const fetchSubmissions = async (page = 1, name = '', staffId = '', dept = '') => {
        setIsLoading(true);
        try {
            const adminToken = sessionStorage.getItem('admin_token') || '';
            const search = name || staffId || '';
            const queryParams = new URLSearchParams({
                page: String(page),
                search: search,
                department: dept,
                token: adminToken,
            });

            const response = await fetch(`/api/admin/submissions?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${adminToken}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registry data. Unauthorized or server error.');
            }

            const result = await response.json();
            
            const mappedRecords: SubmissionRecord[] = (result.data || []).map((dbRecord: any) => ({
                id: String(dbRecord.id),
                fullName: dbRecord.full_name || '',
                staffId: dbRecord.staff_id || '',
                role: dbRecord.role || 'staff',
                designation: dbRecord.designation || '',
                phone: dbRecord.phone || '',
                faculty: dbRecord.faculty || '',
                department: dbRecord.department || '',
                username: dbRecord.username || '',
                salaryDeductionAuthorized: Boolean(dbRecord.salary_deduction_authorized),
                staffIdFileName: dbRecord.staff_id_file ? dbRecord.staff_id_file.split('/').pop() || '' : '',
                payslipFileName: dbRecord.payslip_file ? dbRecord.payslip_file.split('/').pop() || '' : '',
                submittedAt: dbRecord.created_at ? dbRecord.created_at.replace('T', ' ').slice(0, 16) : '',
                staffIdFilePath: dbRecord.staff_id_file || '',
                payslipFilePath: dbRecord.payslip_file || '',
                defaultPasswordText: dbRecord.default_password_text || '',
            }));

            setSubmissions(mappedRecords);
            setTotalPages(result.last_page || 1);
            setTotalItems(result.total || 0);
            setCurrentPage(result.current_page || 1);
        } catch (err: any) {
            showNotification('error', err.message || 'An error occurred while loading submissions.');
        } finally {
            setIsLoading(false);
        }
    };

    // Trigger dynamic fetch when inputs change (debounced for smooth typography searching)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchSubmissions(currentPage, searchName, searchStaffId, searchDept);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [currentPage, searchName, searchStaffId, searchDept]);

    // ==========================================
    // 5. Excel (CSV) Export Utility
    // ==========================================
    const handleExport = () => {
        const adminToken = sessionStorage.getItem('admin_token') || '';
        const search = searchName || searchStaffId || '';
        const queryParams = new URLSearchParams({
            search: search,
            department: searchDept,
            token: adminToken,
        });

        // Streams CSV directly from SQLite back-end
        window.location.href = `/api/admin/submissions/export?${queryParams.toString()}`;
        showNotification('success', 'Preparing your registry export download...');
    };

    // ==========================================
    // 6. Pagination & Selection Helpers
    // ==========================================
    const paginatedSubmissions = submissions;
    const verifiedPage = currentPage;
    const startIndex = (currentPage - 1) * itemsPerPage;

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Secure document downloading from storage/app/private/uploads/
    const downloadPrivateFile = (filePath?: string, filename?: string) => {
        if (!filePath) {
            showNotification('error', 'File path is not available.');
            return;
        }
        const adminToken = sessionStorage.getItem('admin_token') || '';
        const queryParams = new URLSearchParams({
            path: filePath,
            token: adminToken,
        });
        const link = document.createElement('a');
        link.href = `/api/admin/submissions/file?${queryParams.toString()}`;
        link.download = filename || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('info', `Downloading document: ${filename || 'file'}`);
    };

    // Open inline modal preview for images and PDFs
    const openPreview = (title: string, fileName?: string, filePath?: string) => {
        if (!filePath) {
            showNotification('error', 'Document file is not available for preview.');
            return;
        }
        const lower = (fileName || filePath).toLowerCase();
        const isPdf = lower.endsWith('.pdf');
        setPreviewDoc({
            title,
            fileName: fileName || filePath.split('/').pop() || 'Document',
            filePath,
            isPdf,
        });
    };

    // Get preview URL with preview parameter
    const getPreviewUrl = (filePath: string) => {
        const adminToken = sessionStorage.getItem('admin_token') || '';
        const queryParams = new URLSearchParams({
            path: filePath,
            token: adminToken,
            preview: '1',
        });
        return `/api/admin/submissions/file?${queryParams.toString()}`;
    };

    return (
        <div className="w-full bg-white border border-slate-350 rounded-xl shadow-md overflow-hidden relative text-slate-900 font-sans animate-fadeIn">
            
            {/* Notification Banner */}
            {notification && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
                    <div className={`p-4 rounded-lg shadow-md border flex gap-3 items-center ${
                        notification.type === 'success'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : notification.type === 'error'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-blue-50 border-blue-300 text-blue-800'
                    }`}>
                        <div className="flex-shrink-0">
                            {notification.type === 'success' && (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {notification.type === 'error' && (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {notification.type === 'info' && (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold">{notification.message}</p>
                    </div>
                </div>
            )}

            {/* Clean Dashboard Top Bar (Self-contained, no duplicate school banner) */}
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                        Administrative Registry Console
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage staff registrations, inspect credentials, and verify uploaded institutional documents.
                    </p>
                </div>
                
                {/* Bulk Export Button */}
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleExport}
                        className="w-full sm:w-auto px-4 py-2.5 bg-[#2856C3] hover:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Dataset (CSV)
                    </button>
                </div>
            </div>

            {/* Filter Control Bar */}
            <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Search & Filter Registry
                    </h3>
                    {(searchName || searchStaffId || searchDept) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchName('');
                                setSearchStaffId('');
                                setSearchDept('');
                                setCurrentPage(1);
                            }}
                            className="text-xs text-[#2856C3] hover:underline font-bold"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Search by Name */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="filter-name">
                            Name
                        </label>
                        <input
                            type="text"
                            id="filter-name"
                            placeholder="Filter by registrant name"
                            value={searchName}
                            onChange={(e) => {
                                setSearchName(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-[#2856C3] focus:ring-1 focus:ring-[#2856C3]"
                        />
                    </div>

                    {/* Search by Staff ID */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="filter-staffid">
                            Staff ID
                        </label>
                        <input
                            type="text"
                            id="filter-staffid"
                            placeholder="Filter by Staff ID (e.g. UI/STF/)"
                            value={searchStaffId}
                            onChange={(e) => {
                                setSearchStaffId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-[#2856C3] focus:ring-1 focus:ring-[#2856C3]"
                        />
                    </div>

                    {/* Search by Department */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="filter-dept">
                            Department
                        </label>
                        <input
                            type="text"
                            id="filter-dept"
                            placeholder="Filter by Department"
                            value={searchDept}
                            onChange={(e) => {
                                setSearchDept(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-[#2856C3] focus:ring-1 focus:ring-[#2856C3]"
                        />
                    </div>
                </div>

                {(searchName || searchStaffId || searchDept) && (
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchName('');
                                setSearchStaffId('');
                                setSearchDept('');
                                setCurrentPage(1);
                            }}
                            className="text-xs text-ui-blue hover:underline font-bold"
                        >
                            Reset Search Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content Layout (Table + Side details viewer) */}
            <div className="flex flex-col lg:flex-row min-h-[500px]">
                {/* Table Section */}
                <div className="flex-grow overflow-x-auto">
                    {isLoading ? (
                        <div className="py-24 text-center text-slate-500">
                            <svg className="animate-spin h-8 w-8 text-[#2856C3] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm font-semibold text-slate-700">Loading registry submissions...</p>
                        </div>
                    ) : paginatedSubmissions.length === 0 ? (
                        <div className="py-20 text-center text-slate-600">
                            <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold">No submissions match the current filters.</p>
                            <p className="text-xs text-slate-500 mt-1">Try clearing some of your search parameters.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead>
                                <tr className="bg-[#2856C3] text-[10px] text-white font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="py-3.5 px-4">Staff Member</th>
                                    <th className="py-3.5 px-4">Department / Unit</th>
                                    <th className="py-3.5 px-4">Staff ID No.</th>
                                    <th className="py-3.5 px-4">Role</th>
                                    <th className="py-3.5 px-4">Allocated Username</th>
                                    <th className="py-3.5 px-4">Preferred Password</th>
                                    <th className="py-3.5 px-4">Submitted Documents</th>
                                    <th className="py-3.5 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedSubmissions.map((record) => {
                                    const isSelected = selectedSubmission?.id === record.id;
                                    return (
                                        <tr 
                                            key={record.id} 
                                            onClick={() => setSelectedSubmission(record)}
                                            className={`cursor-pointer transition-colors duration-150 ${
                                                isSelected 
                                                    ? 'bg-blue-50/70 border-l-4 border-[#2856C3]' 
                                                    : 'hover:bg-slate-50/80'
                                            }`}
                                        >
                                            {/* Staff Name & Designation */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {record.fullName}
                                                </div>
                                                {record.role === 'staff' && record.designation && (
                                                    <div className="text-[10px] text-ui-gold font-bold uppercase mt-0.5 tracking-wider">
                                                        {record.designation} Staff
                                                    </div>
                                                )}
                                            </td>

                                            {/* Faculty & Department */}
                                            <td className="py-3.5 px-4 text-xs">
                                                <div className="font-semibold text-slate-800">
                                                    {record.department || 'N/A'}
                                                </div>
                                                {record.faculty && (
                                                    <div className="text-slate-500 mt-0.5">
                                                        {record.faculty}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Staff ID */}
                                            <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-800">
                                                {record.staffId}
                                            </td>

                                            {/* Role */}
                                            <td className="py-3.5 px-4 text-xs font-bold text-slate-800 capitalize">
                                                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-[#2856C3] rounded text-[11px]">
                                                    {record.role}
                                                </span>
                                            </td>

                                            {/* Username */}
                                            <td className="py-3.5 px-4 text-xs">
                                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-mono font-bold">
                                                    @{record.username}
                                                </span>
                                            </td>

                                            {/* Plain-text Preferred Password */}
                                            <td className="py-3.5 px-4 text-xs font-mono">
                                                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded font-mono font-semibold select-all">
                                                    {record.defaultPasswordText || 'N/A'}
                                                </span>
                                            </td>

                                            {/* Submitted Documents (Staff ID & Payslip) */}
                                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                                    {/* Staff ID Card */}
                                                    <div className="flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                        <span className="text-[11px] font-medium text-slate-700 truncate max-w-[90px]" title={record.staffIdFileName || 'Staff ID'}>
                                                            ID: {record.staffIdFileName || 'Card'}
                                                        </span>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => openPreview('Staff ID Card Photocopy', record.staffIdFileName, record.staffIdFilePath)}
                                                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#2856C3] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-blue-200/60"
                                                                title="Preview Staff ID"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadPrivateFile(record.staffIdFilePath, record.staffIdFileName)}
                                                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-slate-300"
                                                                title="Download Staff ID"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                                Download
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Payslip */}
                                                    <div className="flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                        <span className="text-[11px] font-medium text-slate-700 truncate max-w-[90px]" title={record.payslipFileName || 'Payslip'}>
                                                            Payslip: {record.payslipFileName || 'Doc'}
                                                        </span>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => openPreview('Recent Payslip Photocopy', record.payslipFileName, record.payslipFilePath)}
                                                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#2856C3] rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-blue-200/60"
                                                                title="Preview Payslip"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                                View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadPrivateFile(record.payslipFilePath, record.payslipFileName)}
                                                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-slate-300"
                                                                title="Download Payslip"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                                Download
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* View Details button */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSubmission(record);
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-200 text-[#2856C3] hover:text-blue-800 rounded-lg border border-slate-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Details Viewer Modal */}
                {selectedSubmission && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
                        {/* Modal Backdrop Click Target */}
                        <div className="absolute inset-0" onClick={() => setSelectedSubmission(null)} />
                        
                        {/* Modal Card */}
                        <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp">
                            {/* Modal Header */}
                            <div className="bg-[#2856C3] text-white p-5 flex justify-between items-center">
                                <h3 className="font-bold font-serif text-white text-base sm:text-lg uppercase tracking-wide">
                                    Registrant Details
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubmission(null)}
                                    className="text-white/80 hover:text-white font-bold text-sm bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded transition-colors cursor-pointer"
                                >
                                    Close ✕
                                </button>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div className="p-6 space-y-4 text-sm text-slate-800 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Full Name</span>
                                        <strong className="text-base text-slate-900 font-bold block">{selectedSubmission.fullName}</strong>
                                    </div>
                                    
                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Staff ID No.</span>
                                        <strong className="font-mono text-slate-900 block font-bold">{selectedSubmission.staffId}</strong>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Role</span>
                                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-[#2856C3] font-bold rounded inline-block text-[11px] mt-0.5 capitalize">
                                            {selectedSubmission.role}
                                        </span>
                                    </div>

                                    {selectedSubmission.role === 'staff' && selectedSubmission.designation && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Designation</span>
                                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded inline-block text-[11px] mt-0.5">
                                                {selectedSubmission.designation} Staff
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Phone Number</span>
                                        <span className="font-bold text-slate-900 block">{selectedSubmission.phone}</span>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Submitted At</span>
                                        <span className="text-slate-700 font-medium block">{selectedSubmission.submittedAt}</span>
                                    </div>

                                    {selectedSubmission.faculty && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Faculty / Unit</span>
                                            <span className="font-semibold text-slate-900 block">{selectedSubmission.faculty}</span>
                                        </div>
                                    )}

                                    {selectedSubmission.department && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">
                                                {selectedSubmission.role === 'director' ? 'Directorate Unit / Main Unit' : 'Department'}
                                            </span>
                                            <span className="font-semibold text-slate-900 block">{selectedSubmission.department}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Preferred Username</span>
                                        <strong className="text-[#2856C3] font-mono font-bold text-sm block mt-0.5">@{selectedSubmission.username}</strong>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Preferred Password (Plain Text)</span>
                                        <strong className="text-slate-900 font-mono font-bold text-sm block mt-0.5 select-all">
                                            {selectedSubmission.defaultPasswordText || 'N/A'}
                                        </strong>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Salary Deduction</span>
                                        <span className="text-emerald-700 font-bold uppercase tracking-wider text-xs block mt-0.5">
                                            {selectedSubmission.salaryDeductionAuthorized ? 'Authorized ✓' : 'Not Authorized'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-200">
                                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Verification Documents</span>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Staff ID card box */}
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                                <svg className="w-4 h-4 text-[#2856C3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5L12 4H9.878A2 2 0 008 5v1h2z" />
                                                </svg>
                                                <span className="truncate" title={selectedSubmission.staffIdFileName}>Staff ID: {selectedSubmission.staffIdFileName}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openPreview('Staff ID Card Photocopy', selectedSubmission.staffIdFileName, selectedSubmission.staffIdFilePath)}
                                                    className="flex-1 py-1.5 px-2 bg-[#2856C3] hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadPrivateFile(selectedSubmission.staffIdFilePath, selectedSubmission.staffIdFileName)}
                                                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </button>
                                            </div>
                                        </div>

                                        {/* Payslip box */}
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                                <svg className="w-4 h-4 text-[#2856C3] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="truncate" title={selectedSubmission.payslipFileName}>Payslip: {selectedSubmission.payslipFileName}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openPreview('Recent Payslip Photocopy', selectedSubmission.payslipFileName, selectedSubmission.payslipFilePath)}
                                                    className="flex-1 py-1.5 px-2 bg-[#2856C3] hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadPrivateFile(selectedSubmission.payslipFilePath, selectedSubmission.payslipFileName)}
                                                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
                                <span>Record Reference: UI-REC-{selectedSubmission.id}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubmission(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Inline Document Preview Modal */}
                {previewDoc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
                        {/* Backdrop Click Target */}
                        <div className="absolute inset-0" onClick={() => setPreviewDoc(null)} />
                        
                        <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp">
                            {/* Preview Header */}
                            <div className="bg-[#2856C3] text-white p-4 sm:p-5 flex justify-between items-center">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                                        {previewDoc.isPdf ? (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white text-sm sm:text-base truncate">
                                            {previewDoc.title}
                                        </h3>
                                        <p className="text-xs text-white/80 font-mono truncate">
                                            {previewDoc.fileName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => downloadPrivateFile(previewDoc.filePath, previewDoc.fileName)}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#2856C3] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDoc(null)}
                                        className="text-white/80 hover:text-white font-bold text-sm bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="p-4 bg-slate-100 flex-grow overflow-auto flex items-center justify-center min-h-[400px]">
                                {previewDoc.isPdf ? (
                                    <iframe
                                        src={getPreviewUrl(previewDoc.filePath)}
                                        title={previewDoc.fileName}
                                        className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white shadow-inner"
                                    />
                                ) : (
                                    <div className="max-h-[70vh] flex items-center justify-center overflow-auto p-2">
                                        <img
                                            src={getPreviewUrl(previewDoc.filePath)}
                                            alt={previewDoc.fileName}
                                            className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                                const parent = (e.target as HTMLElement).parentElement;
                                                if (parent) {
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'text-center p-8 bg-white rounded-xl border border-slate-200';
                                                    fallback.innerHTML = `<p class="text-sm font-semibold text-slate-700">Preview rendering fallback.</p><p class="text-xs text-slate-500 mt-1">Please use the download button to inspect this file.</p>`;
                                                    parent.appendChild(fallback);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Preview Footer */}
                            <div className="bg-white p-3.5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                                <span>Document Preview Window</span>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc(null)}
                                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls & Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-600 font-semibold">
                    Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} total submissions
                </div>

                {/* Pagination Controls */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handlePageChange(verifiedPage - 1)}
                        disabled={verifiedPage === 1}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                                verifiedPage === pageNum
                                    ? 'bg-[#2856C3] border-[#2856C3] text-white'
                                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                            {pageNum}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => handlePageChange(verifiedPage + 1)}
                        disabled={verifiedPage === totalPages || totalPages === 0}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            </div>

        </div>
    );
}
