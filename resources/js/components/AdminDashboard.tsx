import React, { useState } from 'react';

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
    status: 'Pending' | 'Approved' | 'Rejected';
    staffIdFileName: string;
    payslipFileName: string;
    submittedAt: string;
}

// ==========================================
// 2. Initial Mock Data
// ==========================================
const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
    {
        id: '1',
        fullName: 'Prof. Adebayo Olukunle',
        staffId: 'UI/STF/3829',
        designation: 'Academic',
        phone: '08033221144',
        faculty: 'Faculty of Science',
        department: 'Computer Science',
        username: 'a.olukunle',
        salaryDeductionAuthorized: true,
        status: 'Pending',
        staffIdFileName: 'adebayo_id_card.pdf',
        payslipFileName: 'adebayo_payslip_june.png',
        submittedAt: '2026-07-12 10:45',
    },
    {
        id: '2',
        fullName: 'Dr. Elizabeth Olowo',
        staffId: 'UI/STF/7412',
        designation: 'Academic',
        phone: '08122334455',
        faculty: 'Faculty of Clinical Sciences',
        department: 'Medicine',
        username: 'e.olowo',
        salaryDeductionAuthorized: true,
        status: 'Approved',
        staffIdFileName: 'elizabeth_id_card.png',
        payslipFileName: 'elizabeth_payslip_june.pdf',
        submittedAt: '2026-07-11 08:30',
    },
    {
        id: '3',
        fullName: 'Mrs. Funmilayo Akinyele',
        staffId: 'UI/STF/9021',
        designation: 'Non-Teaching',
        phone: '09055443322',
        faculty: 'Main Administration',
        department: 'Registry Division',
        username: 'f.akinyele',
        salaryDeductionAuthorized: true,
        status: 'Approved',
        staffIdFileName: 'funmi_staff_id.jpg',
        payslipFileName: 'funmi_payslip_may.pdf',
        submittedAt: '2026-07-10 14:15',
    },
    {
        id: '4',
        fullName: 'Mr. Jude Chukwu',
        staffId: 'UI/STF/2145',
        designation: 'Non-Teaching',
        phone: '07066778899',
        faculty: 'Faculty of Technology',
        department: 'Electrical Engineering',
        username: 'j.chukwu',
        salaryDeductionAuthorized: true,
        status: 'Rejected',
        staffIdFileName: 'jude_id_expired.pdf',
        payslipFileName: 'jude_payslip_april.png',
        submittedAt: '2026-07-09 11:20',
    },
    {
        id: '5',
        fullName: 'Dr. Babajide Sowande',
        staffId: 'UI/STF/5581',
        designation: 'Academic',
        phone: '08055667788',
        faculty: 'Faculty of Arts',
        department: 'Linguistics & Nigerian Languages',
        username: 'b.sowande',
        salaryDeductionAuthorized: true,
        status: 'Pending',
        staffIdFileName: 'sowande_staff_id.pdf',
        payslipFileName: 'sowande_payslip_june.pdf',
        submittedAt: '2026-07-13 16:40',
    },
    {
        id: '6',
        fullName: 'Mrs. Chinyere Nwosu',
        staffId: 'UI/STF/4432',
        designation: 'Non-Teaching',
        phone: '08166554433',
        faculty: 'Faculty of Social Sciences',
        department: 'Economics',
        username: 'c.nwosu',
        salaryDeductionAuthorized: true,
        status: 'Pending',
        staffIdFileName: 'chinyere_id_card.png',
        payslipFileName: 'chinyere_payslip_june.png',
        submittedAt: '2026-07-14 09:10',
    }
];

export default function AdminDashboard() {
    // ==========================================
    // 3. State Management
    // ==========================================
    const [submissions, setSubmissions] = useState<SubmissionRecord[]>(INITIAL_SUBMISSIONS);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [designationFilter, setDesignationFilter] = useState<string>('All');
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // ==========================================
    // 4. State Modification Actions
    // ==========================================
    const updateStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
        const record = submissions.find(r => r.id === id);
        if (!record) return;

        setSubmissions(prev => 
            prev.map(item => 
                item.id === id ? { ...item, status: newStatus } : item
            )
        );

        showNotification(
            'success', 
            `Successfully marked ${record.fullName}'s registration as ${newStatus}.`
        );
    };

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    // ==========================================
    // 5. Excel (CSV) Export Utility
    // ==========================================
    const escapeCSVValue = (val: string | boolean) => {
        const text = String(val);
        // Escape quotes by doubling them, wrap in quotes if it has quotes, commas or newlines
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const triggerDownload = (csvContent: string, filename: string) => {
        const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportSingle = (record: SubmissionRecord) => {
        const headers = [
            'Name', 'Staff ID', 'Designation', 'Phone', 'Faculty', 'Department', 
            'Preferred Username', 'Salary Deduction Authorized', 'Verification ID Card File', 
            'Verification Payslip File', 'Status', 'Submitted At'
        ];
        const row = [
            record.fullName,
            record.staffId,
            record.designation,
            record.phone,
            record.faculty,
            record.department,
            `@${record.username}`,
            record.salaryDeductionAuthorized ? 'Yes' : 'No',
            record.staffIdFileName,
            record.payslipFileName,
            record.status,
            record.submittedAt
        ];

        const csvContent = [
            headers.join(','),
            row.map(escapeCSVValue).join(',')
        ].join('\n');

        const cleanFilename = `${record.fullName.toLowerCase().replace(/\s+/g, '_')}_registration.csv`;
        triggerDownload(csvContent, cleanFilename);
        showNotification('info', `Downloaded single export for ${record.fullName}`);
    };

    const exportBulk = (recordsToExport: SubmissionRecord[]) => {
        if (recordsToExport.length === 0) {
            showNotification('error', 'No records match the current filters to export.');
            return;
        }

        const headers = [
            'Name', 'Staff ID', 'Designation', 'Phone', 'Faculty', 'Department', 
            'Preferred Username', 'Salary Deduction Authorized', 'Verification ID Card File', 
            'Verification Payslip File', 'Status', 'Submitted At'
        ];
        const rows = recordsToExport.map(record => [
            record.fullName,
            record.staffId,
            record.designation,
            record.phone,
            record.faculty,
            record.department,
            `@${record.username}`,
            record.salaryDeductionAuthorized ? 'Yes' : 'No',
            record.staffIdFileName,
            record.payslipFileName,
            record.status,
            record.submittedAt
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSVValue).join(','))
        ].join('\n');

        const cleanFilename = `ui_network_registry_export_${new Date().toISOString().slice(0,10)}.csv`;
        triggerDownload(csvContent, cleanFilename);
        showNotification('info', `Successfully exported ${recordsToExport.length} records.`);
    };

    // ==========================================
    // 6. Filter & Search Logic
    // ==========================================
    const filteredSubmissions = submissions.filter(item => {
        const matchesSearch = 
            item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.department.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        const matchesDesignation = designationFilter === 'All' || item.designation === designationFilter;

        return matchesSearch && matchesStatus && matchesDesignation;
    });

    // Metric Counts
    const totalCount = submissions.length;
    const pendingCount = submissions.filter(s => s.status === 'Pending').length;
    const approvedCount = submissions.filter(s => s.status === 'Approved').length;
    const rejectedCount = submissions.filter(s => s.status === 'Rejected').length;

    // Helper to simulate document download/viewing
    const simulateDownload = (filename: string) => {
        showNotification('info', `Simulating download/retrieval of file: ${filename}`);
    };

    return (
        <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative backdrop-blur-md">
            
            {/* Glowing Accent Orbs */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-ui-blue/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-ui-gold/10 rounded-full blur-3xl pointer-events-none" />

            {/* Notification Banner */}
            {notification && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn max-w-md w-full px-4">
                    <div className={`p-4 rounded-xl shadow-lg border flex gap-3 items-center ${
                        notification.type === 'success'
                            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                            : notification.type === 'error'
                            ? 'bg-red-950/90 border-red-500/30 text-red-300'
                            : 'bg-blue-950/90 border-blue-500/30 text-blue-300'
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
            <div className="relative border-b border-slate-800 bg-slate-950/60 p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-ui-gold to-yellow-800 rounded-2xl flex items-center justify-center shadow-lg border border-ui-gold/20">
                        <svg className="w-8 h-8 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 11l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 tracking-wide">
                            ADMINISTRATIVE CONSOLE
                        </h2>
                        <p className="text-xs font-semibold text-ui-gold uppercase tracking-widest mt-0.5">
                            Network Submissions & Document Verification
                        </p>
                    </div>
                </div>
                
                {/* Bulk Export Button */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => exportBulk(filteredSubmissions)}
                        className="px-5 py-2.5 bg-gradient-to-r from-ui-gold to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-slate-950 rounded-xl text-xs sm:text-sm font-bold tracking-wide shadow-lg shadow-ui-gold/10 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export List ({filteredSubmissions.length})
                    </button>
                </div>
            </div>

            {/* KPI Cards / Metrics Panel */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 bg-slate-900/40 border-b border-slate-800/80">
                
                {/* Metric Card: Total */}
                <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-ui-blue/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Applications</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-2 font-mono">{totalCount}</span>
                </div>

                {/* Metric Card: Pending */}
                <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center gap-2 justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Review</span>
                        {pendingCount > 0 && <span className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />}
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-ui-gold mt-2 font-mono">{pendingCount}</span>
                </div>

                {/* Metric Card: Approved */}
                <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approved Accounts</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 font-mono">{approvedCount}</span>
                </div>

                {/* Metric Card: Rejected */}
                <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rejected Requests</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-2 font-mono">{rejectedCount}</span>
                </div>

            </div>

            {/* Filter Control Bar */}
            <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-950/20 border-b border-slate-800/60">
                
                {/* Search Input */}
                <div className="relative w-full lg:max-w-md">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search Name, Staff ID, Username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-ui-blue focus:ring-2 focus:ring-ui-blue/20 text-sm transition-all duration-200"
                    />
                </div>

                {/* Select Dropdowns */}
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    
                    {/* Filter by Designation */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase hidden sm:inline">Designation:</span>
                        <select
                            value={designationFilter}
                            onChange={(e) => setDesignationFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-ui-blue focus:ring-2 focus:ring-ui-blue/20 w-full sm:w-auto"
                        >
                            <option value="All">All Designations</option>
                            <option value="Academic">Academic Staff</option>
                            <option value="Non-Teaching">Non-Teaching Staff</option>
                        </select>
                    </div>

                    {/* Filter by Status */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase hidden sm:inline">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-ui-blue focus:ring-2 focus:ring-ui-blue/20 w-full sm:w-auto"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    {/* Reset Button */}
                    {(searchQuery || statusFilter !== 'All' || designationFilter !== 'All') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('All');
                                setDesignationFilter('All');
                            }}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl border border-slate-700/80 transition-colors cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

            </div>

            {/* Table Element */}
            <div className="overflow-x-auto w-full">
                {filteredSubmissions.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-semibold">No submissions match the current filters.</p>
                        <p className="text-xs text-slate-600 mt-1">Try clearing search text or resetting dropdowns.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-950/40 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-850">
                                <th className="py-4 px-6">Staff Member</th>
                                <th className="py-4 px-6">Unit / Department</th>
                                <th className="py-4 px-6">System ID / Phone</th>
                                <th className="py-4 px-6">Requested Username</th>
                                <th className="py-4 px-6">Verification Files</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/50">
                            {filteredSubmissions.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-950/20 transition-all duration-150">
                                    {/* Staff Name & Designation */}
                                    <td className="py-4 px-6">
                                        <div className="font-semibold text-slate-200 text-sm">
                                            {record.fullName}
                                        </div>
                                        <div className="text-[10px] text-ui-gold font-bold uppercase mt-0.5 tracking-wider">
                                            {record.designation} Staff
                                        </div>
                                    </td>

                                    {/* Faculty & Department */}
                                    <td className="py-4 px-6">
                                        <div className="text-xs text-slate-300">
                                            {record.department}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {record.faculty}
                                        </div>
                                    </td>

                                    {/* Staff ID & Phone */}
                                    <td className="py-4 px-6 text-xs">
                                        <div className="font-mono text-slate-350 tracking-wide">
                                            {record.staffId}
                                        </div>
                                        <div className="text-slate-500 mt-0.5 font-medium">
                                            {record.phone}
                                        </div>
                                    </td>

                                    {/* Username */}
                                    <td className="py-4 px-6 text-xs">
                                        <span className="px-2.5 py-1 bg-ui-blue/10 border border-ui-blue/20 text-ui-blue rounded-lg font-mono font-bold">
                                            @{record.username}
                                        </span>
                                    </td>

                                    {/* Files */}
                                    <td className="py-4 px-6 space-y-1.5">
                                        {/* Staff ID file */}
                                        <button
                                            type="button"
                                            onClick={() => simulateDownload(record.staffIdFileName)}
                                            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-ui-blue hover:underline transition-colors font-medium cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5L12 4H9.878A2 2 0 008 5v1h2z" />
                                            </svg>
                                            ID Card Photocopy
                                        </button>

                                        {/* Payslip file */}
                                        <button
                                            type="button"
                                            onClick={() => simulateDownload(record.payslipFileName)}
                                            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-ui-blue hover:underline transition-colors font-medium cursor-pointer"
                                        >
                                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Recent Payslip
                                        </button>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-4 px-6 text-xs">
                                        {record.status === 'Approved' && (
                                            <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 rounded-full font-bold uppercase tracking-wider text-[10px] inline-flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                Approved
                                            </span>
                                        )}
                                        {record.status === 'Pending' && (
                                            <span className="px-2 py-0.5 bg-yellow-950/60 border border-yellow-900/30 text-yellow-500 rounded-full font-bold uppercase tracking-wider text-[10px] inline-flex items-center gap-1 animate-pulse">
                                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                                                Pending
                                            </span>
                                        )}
                                        {record.status === 'Rejected' && (
                                            <span className="px-2 py-0.5 bg-red-950/60 border border-red-900/30 text-red-400 rounded-full font-bold uppercase tracking-wider text-[10px] inline-flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                                Rejected
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-4 px-6">
                                        <div className="flex justify-center items-center gap-2">
                                            {record.status === 'Pending' ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(record.id, 'Approved')}
                                                        className="p-1.5 bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-800/40 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                                        title="Approve Submission"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(record.id, 'Rejected')}
                                                        className="p-1.5 bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-800/40 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                                        title="Reject Submission"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 font-bold uppercase italic mr-1">
                                                    Processed
                                                </span>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => exportSingle(record)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/80 transition-colors cursor-pointer"
                                                title="Export Single Record to CSV"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bottom Footer Details */}
            <div className="p-4 sm:p-6 bg-slate-950/60 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center flex-wrap gap-2">
                <span>Showing {filteredSubmissions.length} of {totalCount} total entries</span>
                <span className="font-mono">Security Level: ITNH Admin Level-1</span>
            </div>

        </div>
    );
}
