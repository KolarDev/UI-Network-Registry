import React, { useState, useEffect } from 'react';

// ==========================================
// 1. TypeScript Interfaces
// ==========================================
export interface SubmissionRecord {
    id: string;
    fullName: string;
    staffId: string;
    designation: 'Academic' | 'Non-Teaching';
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
                designation: dbRecord.designation || 'Academic',
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

    // Secure document preview downloading from storage/app/private/uploads/
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
        window.open(`/api/admin/submissions/file?${queryParams.toString()}`);
        showNotification('info', `Retrieving document: ${filename}`);
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

            {/* Portal Header */}
            <div className="relative border-b border-slate-200 bg-[#2856C3] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center">
                        <img src="/images/ui-logo.jpg" alt="University of Ibadan Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide">
                            ADMINISTRATIVE CONSOLE
                        </h2>
                        <p className="text-xs font-bold text-ui-gold uppercase tracking-wider mt-0.5">
                            ITMS Staff Network Submission Registry
                        </p>
                    </div>
                </div>
                
                {/* Bulk Export Button */}
                <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                    <button
                        type="button"
                        onClick={handleExport}
                        className="w-full md:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-[#2856C3] rounded-lg text-xs sm:text-sm font-bold tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Filtered Dataset (CSV)
                    </button>
                </div>
            </div>

            {/* Filter Control Bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Search & Filter Registry
                </h3>
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
                    {paginatedSubmissions.length === 0 ? (
                        <div className="py-20 text-center text-slate-600">
                            <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold">No submissions match the current filters.</p>
                            <p className="text-xs text-slate-500 mt-1">Try clearing some of your search parameters.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-[#2856C3] text-[10px] text-white font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="py-3 px-4">Staff Member</th>
                                    <th className="py-3 px-4">Department / Unit</th>
                                    <th className="py-3 px-4">Staff ID No.</th>
                                    <th className="py-3 px-4">Allocated Username</th>
                                    <th className="py-3 px-4 text-center">Action</th>
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
                                                    ? 'bg-blue-50/70 border-l-4 border-ui-blue' 
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            {/* Staff Name & Designation */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {record.fullName}
                                                </div>
                                                <div className="text-[10px] text-ui-gold font-bold uppercase mt-0.5 tracking-wider">
                                                    {record.designation} Staff
                                                </div>
                                            </td>

                                            {/* Faculty & Department */}
                                            <td className="py-3.5 px-4 text-xs">
                                                <div className="font-semibold text-slate-800">
                                                    {record.department}
                                                </div>
                                                <div className="text-slate-600 mt-0.5">
                                                    {record.faculty}
                                                </div>
                                            </td>

                                            {/* Staff ID */}
                                            <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-800">
                                                {record.staffId}
                                            </td>

                                            {/* Username */}
                                            <td className="py-3.5 px-4 text-xs">
                                                <span className="px-2 py-0.5 bg-blue-50 border border-[#2856C3]/20 text-ui-blue rounded font-mono font-bold">
                                                    @{record.username}
                                                </span>
                                            </td>

                                            {/* View Details button */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSubmission(record);
                                                    }}
                                                    className="px-3 py-1 bg-slate-50 hover:bg-slate-200 text-[#2856C3] hover:text-blue-800 rounded border border-slate-300 text-xs font-bold cursor-pointer"
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
                                    className="text-white/80 hover:text-white font-bold text-sm bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded transition-colors"
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
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Designation</span>
                                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded inline-block text-[11px] mt-0.5">
                                            {selectedSubmission.designation} Staff
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Phone Number</span>
                                        <span className="font-bold text-slate-900 block">{selectedSubmission.phone}</span>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Submitted At</span>
                                        <span className="text-slate-700 font-medium block">{selectedSubmission.submittedAt}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Faculty / Unit</span>
                                        <span className="font-semibold text-slate-900 block">{selectedSubmission.faculty}</span>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Department</span>
                                        <span className="font-semibold text-slate-900 block">{selectedSubmission.department}</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Preferred Username</span>
                                        <strong className="text-[#2856C3] font-mono font-bold text-sm">@{selectedSubmission.username}</strong>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Salary Deduction</span>
                                        <span className="text-emerald-700 font-bold uppercase tracking-wider text-xs block mt-0.5">
                                            {selectedSubmission.salaryDeductionAuthorized ? 'Authorized ✓' : 'Not Authorized'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-200">
                                    <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Verification Documents</span>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Staff ID card file mock link */}
                                        <button
                                            type="button"
                                            onClick={() => downloadPrivateFile(selectedSubmission.staffIdFilePath, selectedSubmission.staffIdFileName)}
                                            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left font-semibold text-[#2856C3] hover:underline flex items-center gap-2 cursor-pointer text-xs"
                                        >
                                            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5L12 4H9.878A2 2 0 008 5v1h2z" />
                                            </svg>
                                            <span className="truncate">{selectedSubmission.staffIdFileName}</span>
                                        </button>

                                        {/* Payslip file mock link */}
                                        <button
                                            type="button"
                                            onClick={() => downloadPrivateFile(selectedSubmission.payslipFilePath, selectedSubmission.payslipFileName)}
                                            className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-left font-semibold text-[#2856C3] hover:underline flex items-center gap-2 cursor-pointer text-xs"
                                        >
                                            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="truncate">{selectedSubmission.payslipFileName}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-slate-55 p-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-550">
                                <span>Record Reference: UI-REC-{selectedSubmission.id}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubmission(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls & Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-600 font-semibold">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} total submissions
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
                        disabled={verifiedPage === totalPages}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            </div>

        </div>
    );
}
