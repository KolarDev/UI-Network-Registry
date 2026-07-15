import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

// ==========================================
// 1. TypeScript Interfaces
// ==========================================
export interface RegistrationFormData {
    // Personal Profile
    fullName: string;
    staffId: string;
    designation: 'Academic' | 'Non-Teaching' | '';
    phone: string;
    faculty: string;
    department: string;

    // Credentials
    username: string;
    password: string;
    passwordConfirmation: string;

    // Billing & Documents
    salaryDeductionAuthorized: boolean;
    staffIdFile: File | null;
    payslipFile: File | null;
}

export interface ValidationErrors {
    fullName?: string;
    staffId?: string;
    designation?: string;
    phone?: string;
    faculty?: string;
    department?: string;
    username?: string;
    password?: string;
    passwordConfirmation?: string;
    salaryDeductionAuthorized?: string;
    staffIdFile?: string;
    payslipFile?: string;
}

export default function RegistrationForm() {
    // ==========================================
    // 2. State & References
    // ==========================================
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [formData, setFormData] = useState<RegistrationFormData>({
        fullName: '',
        staffId: '',
        designation: '',
        phone: '',
        faculty: '',
        department: '',
        username: '',
        password: '',
        passwordConfirmation: '',
        salaryDeductionAuthorized: false,
        staffIdFile: null,
        payslipFile: null,
    });

    const [errors, setErrors] = useState<ValidationErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submissionResult, setSubmissionResult] = useState<{
        success: boolean;
        reference?: string;
        message?: string;
        sentData?: Record<string, string>;
    } | null>(null);

    // File Input Refs
    const staffIdInputRef = useRef<HTMLInputElement>(null);
    const payslipInputRef = useRef<HTMLInputElement>(null);

    // Drag-over States
    const [isDragOverStaffId, setIsDragOverStaffId] = useState<boolean>(false);
    const [isDragOverPayslip, setIsDragOverPayslip] = useState<boolean>(false);

    // ==========================================
    // 3. Validation Logic
    // ==========================================
    const validateUsername = (val: string): boolean => {
        const regex = /^[a-z]{1,4}\.[a-z]{2,20}$/;
        return regex.test(val);
    };

    const validateStaffId = (val: string): boolean => {
        const regex = /^UI\/STF\/\d+$/;
        return regex.test(val);
    };

    const validatePhone = (val: string): boolean => {
        const regex = /^(?:\+234|0)[789][01]\d{8}$/;
        return regex.test(val.replace(/\s+/g, ''));
    };

    const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
        if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-300' };
        let score = 0;
        if (pwd.length >= 8) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        switch (score) {
            case 1: return { score: 25, label: 'Weak ⚠️', color: 'bg-red-500' };
            case 2: return { score: 50, label: 'Fair ⚡', color: 'bg-orange-500' };
            case 3: return { score: 75, label: 'Good 👍', color: 'bg-yellow-500' };
            case 4: return { score: 100, label: 'Strong 💪', color: 'bg-emerald-500' };
            default: return { score: 10, label: 'Too short ❌', color: 'bg-red-600' };
        }
    };

    const validateStep = (step: number): boolean => {
        const newErrors: ValidationErrors = {};

        if (step === 1) {
            if (!formData.fullName.trim()) {
                newErrors.fullName = 'Full Name is required.';
            } else if (formData.fullName.trim().length < 3) {
                newErrors.fullName = 'Name must be at least 3 characters.';
            }

            if (!formData.staffId) {
                newErrors.staffId = 'Staff ID No. is required.';
            } else if (!validateStaffId(formData.staffId)) {
                newErrors.staffId = 'Invalid format. Use "UI/STF/[Numbers]" (e.g., UI/STF/1234).';
            }

            if (!formData.designation) {
                newErrors.designation = 'Please select your designation.';
            }

            if (!formData.phone) {
                newErrors.phone = 'Phone number is required.';
            } else if (!validatePhone(formData.phone)) {
                newErrors.phone = 'Invalid phone number. Must be a valid Nigerian number (e.g. 08031234567).';
            }

            if (!formData.faculty.trim()) {
                newErrors.faculty = 'Faculty / Main Unit is required.';
            }

            if (!formData.department.trim()) {
                newErrors.department = 'Department is required.';
            }
        }

        if (step === 2) {
            if (!formData.username) {
                newErrors.username = 'Preferred Username is required.';
            } else if (!validateUsername(formData.username)) {
                newErrors.username = 'Must be lowercase in initials.surname format (e.g. "ja.brown").';
            }

            if (!formData.password) {
                newErrors.password = 'Password is required.';
            } else if (formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters.';
            }

            if (formData.password !== formData.passwordConfirmation) {
                newErrors.passwordConfirmation = 'Passwords do not match.';
            }
        }

        if (step === 3) {
            if (!formData.salaryDeductionAuthorized) {
                newErrors.salaryDeductionAuthorized = 'You must authorize the salary deduction to proceed.';
            }

            if (!formData.staffIdFile) {
                newErrors.staffIdFile = 'Staff ID card photocopy is required.';
            }

            if (!formData.payslipFile) {
                newErrors.payslipFile = 'Recent payslip photocopy is required.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ==========================================
    // 4. Form Actions & Handlers
    // ==========================================
    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => prev - 1);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let cleanedValue = value;
        if (name === 'username') {
            cleanedValue = value.toLowerCase().replace(/\s+/g, '');
        } else if (name === 'staffId') {
            cleanedValue = value.toUpperCase().replace(/\s+/g, '');
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : cleanedValue,
        }));

        if (errors[name as keyof ValidationErrors]) {
            setErrors((prev) => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldName: 'staffIdFile' | 'payslipFile') => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({
            ...prev,
            [fieldName]: file,
        }));

        if (errors[fieldName]) {
            setErrors((prev) => ({
                ...prev,
                [fieldName]: undefined,
            }));
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, fieldName: 'staffIdFile' | 'payslipFile') => {
        e.preventDefault();
        if (fieldName === 'staffIdFile') setIsDragOverStaffId(true);
        if (fieldName === 'payslipFile') setIsDragOverPayslip(true);
    };

    const handleDragLeave = (fieldName: 'staffIdFile' | 'payslipFile') => {
        if (fieldName === 'staffIdFile') setIsDragOverStaffId(false);
        if (fieldName === 'payslipFile') setIsDragOverPayslip(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, fieldName: 'staffIdFile' | 'payslipFile') => {
        e.preventDefault();
        if (fieldName === 'staffIdFile') setIsDragOverStaffId(false);
        if (fieldName === 'payslipFile') setIsDragOverPayslip(false);

        const file = e.dataTransfer.files?.[0] || null;
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({
                    ...prev,
                    [fieldName]: 'File is too large. Maximum size is 5MB.',
                }));
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                setErrors((prev) => ({
                    ...prev,
                    [fieldName]: 'Only JPEG, PNG, or PDF files are accepted.',
                }));
                return;
            }

            setFormData((prev) => ({
                ...prev,
                [fieldName]: file,
            }));

            if (errors[fieldName]) {
                setErrors((prev) => ({
                    ...prev,
                    [fieldName]: undefined,
                }));
            }
        }
    };

    const removeFile = (fieldName: 'staffIdFile' | 'payslipFile') => {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: null,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const submissionData = new FormData();
            
            submissionData.append('fullName', formData.fullName.trim());
            submissionData.append('staffId', formData.staffId);
            submissionData.append('designation', formData.designation);
            submissionData.append('phone', formData.phone.trim());
            submissionData.append('faculty', formData.faculty.trim());
            submissionData.append('department', formData.department.trim());
            submissionData.append('username', formData.username);
            submissionData.append('password', formData.password);
            submissionData.append('salaryDeductionAuthorized', formData.salaryDeductionAuthorized ? '1' : '0');

            if (formData.staffIdFile) {
                submissionData.append('staffIdFile', formData.staffIdFile);
            }
            if (formData.payslipFile) {
                submissionData.append('payslipFile', formData.payslipFile);
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                body: submissionData,
                headers: {
                    'Accept': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setSubmissionResult({
                    success: true,
                    reference: result.reference,
                    message: result.message,
                    sentData: result.sentData,
                });
                setCurrentStep(5);
            } else {
                if (result.errors) {
                    const validationErrors: ValidationErrors = {};
                    Object.keys(result.errors).forEach((key) => {
                        const messages = result.errors[key];
                        validationErrors[key as keyof ValidationErrors] = Array.isArray(messages) ? messages[0] : messages;
                    });
                    setErrors(validationErrors);

                    // Redirect back to the step with errors
                    if (
                        validationErrors.fullName ||
                        validationErrors.staffId ||
                        validationErrors.designation ||
                        validationErrors.phone ||
                        validationErrors.faculty ||
                        validationErrors.department
                    ) {
                        setCurrentStep(1);
                    } else if (
                        validationErrors.username ||
                        validationErrors.password ||
                        validationErrors.passwordConfirmation
                    ) {
                        setCurrentStep(2);
                    } else {
                        setCurrentStep(3);
                    }
                    
                    setSubmissionResult({
                        success: false,
                        message: 'Validation failed. Please correct the highlighted errors.',
                    });
                } else {
                    throw new Error(result.message || 'A network error occurred while submitting your registration.');
                }
            }
        } catch (err: any) {
            setSubmissionResult({
                success: false,
                message: err.message || 'A network error occurred while submitting your registration. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            staffId: '',
            designation: '',
            phone: '',
            faculty: '',
            department: '',
            username: '',
            password: '',
            passwordConfirmation: '',
            salaryDeductionAuthorized: false,
            staffIdFile: null,
            payslipFile: null,
        });
        setErrors({});
        setSubmissionResult(null);
        setCurrentStep(1);
    };

    const pwdStrength = getPasswordStrength(formData.password);

    return (
        <div className="w-full max-w-4xl bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden relative">
            
            {/* Portal Header */}
            <div className="relative border-b border-slate-200 bg-[#2856C3] text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center">
                        <img src="/images/ui-logo.jpg" alt="University of Ibadan Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide">
                            UNIVERSITY OF IBADAN
                        </h2>
                        <p className="text-xs font-bold text-ui-gold uppercase tracking-wider mt-0.5">
                            Information Technology & Media Services
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end text-right">
                    <span className="px-3 py-1 bg-white border border-slate-200 text-[#2856C3] rounded-md text-xs font-bold tracking-wider uppercase">
                        ITNH Network Registry
                    </span>
                    <span className="text-[10px] text-slate-100 font-bold mt-1">Form: UI/ITMS/NET/STF-01</span>
                </div>
            </div>

            {/* Step Wizard Progress Bar */}
            {currentStep <= 4 && (
                <div className="px-6 sm:px-12 pt-8 pb-4 bg-slate-50 relative border-b border-slate-200">
                    <div className="flex justify-between items-center relative">
                        {/* Progress Background Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-300 -translate-y-1/2 z-0" />
                        {/* Active Progress Line */}
                        <div 
                            className="absolute top-1/2 left-0 h-0.5 bg-ui-blue -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" 
                            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                        />

                        {/* Step Points */}
                        {[
                            { step: 1, label: 'Profile', desc: 'Personal Data' },
                            { step: 2, label: 'Identity', desc: 'Account Credentials' },
                            { step: 3, label: 'Verification', desc: 'Billing & Uploads' },
                            { step: 4, label: 'Review', desc: 'Submit Application' },
                        ].map((s) => {
                            const isCompleted = currentStep > s.step;
                            const isActive = currentStep === s.step;
                            return (
                                <div key={s.step} className="flex flex-col items-center z-10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (s.step < currentStep) setCurrentStep(s.step);
                                        }}
                                        disabled={s.step > currentStep}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                                            isCompleted
                                                ? 'bg-ui-blue border-ui-blue text-white shadow-sm'
                                                : isActive
                                                ? 'bg-white border-ui-gold text-ui-gold scale-110'
                                                : 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            s.step
                                        )}
                                    </button>
                                    <span className={`text-xs font-bold mt-2 tracking-wide hidden sm:block ${isActive ? 'text-ui-gold' : isCompleted ? 'text-ui-blue' : 'text-slate-700'}`}>
                                        {s.label}
                                    </span>
                                    <span className="text-[10px] text-slate-650 hidden md:block mt-0.5 font-bold">
                                        {s.desc}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Form Content */}
            <div className="p-6 sm:p-8 md:p-10">
                {currentStep === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="text-ui-gold font-serif">I.</span> Personal Data Section
                            </h3>
                            <p className="text-slate-700 text-sm mt-1">Please enter your official university staff records.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="fullName">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.fullName 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. Prof. Olusola Babalola"
                                    />
                                    {errors.fullName && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.fullName}</span>
                                    )}
                                </div>
                            </div>

                            {/* Staff ID */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="staffId">
                                    Staff ID No. <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="staffId"
                                        name="staffId"
                                        value={formData.staffId}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 uppercase tracking-widest ${
                                            errors.staffId 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="UI/STF/1234"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">Format: UI/STF/&lt;Number&gt;</span>
                                    {errors.staffId && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.staffId}</span>
                                    )}
                                </div>
                            </div>

                            {/* Designation */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="designation">
                                    Designation <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="designation"
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 appearance-none ${
                                            errors.designation 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                    >
                                        <option value="" className="text-slate-450">Select Designation</option>
                                        <option value="Academic" className="text-slate-850">Academic Staff</option>
                                        <option value="Non-Teaching" className="text-slate-850">Non-Teaching Staff</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {errors.designation && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.designation}</span>
                                    )}
                                </div>
                            </div>

                            {/* Phone No */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="phone">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.phone 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. 08031234567"
                                    />
                                    {errors.phone && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.phone}</span>
                                    )}
                                </div>
                            </div>

                            {/* Faculty / Main Unit */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="faculty">
                                    Faculty / Main Unit <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="faculty"
                                        name="faculty"
                                        value={formData.faculty}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.faculty 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. Faculty of Science"
                                    />
                                    {errors.faculty && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.faculty}</span>
                                    )}
                                </div>
                            </div>

                            {/* Department */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="department">
                                    Department <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="department"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.department 
                                                ? 'border-red-500 focus:ring-red-500/10' 
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. Computer Science"
                                    />
                                    {errors.department && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.department}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-ui-gold font-serif">II.</span> Request Section (Credentials)
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Configure your login credentials for the University Network Portal.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 max-w-2xl">
                            {/* Preferred Username */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="username">
                                        Preferred Username <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-ui-gold font-semibold uppercase tracking-wider">
                                        Rule: initials.surname
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold select-none">
                                        @
                                    </div>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={`w-full pl-9 pr-12 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 lowercase ${
                                            errors.username
                                                ? 'border-red-500 focus:ring-red-500/10'
                                                : formData.username && validateUsername(formData.username)
                                                ? 'border-emerald-500 focus:ring-emerald-500/10'
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. ja.brown"
                                    />
                                    {formData.username && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {validateUsername(formData.username) ? (
                                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-red-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-450 font-medium leading-relaxed">
                                    Username will be used for your official network account. Example initials: "j.a." for John Andrew, surname: "brown" → <span className="text-slate-650">ja.brown</span>
                                </span>
                                {errors.username && (
                                    <span className="text-xs text-red-500 mt-1 block font-medium">{errors.username}</span>
                                )}
                            </div>

                            {/* Preferred Password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="password">
                                    Preferred Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.password
                                                ? 'border-red-500 focus:ring-red-500/10'
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                
                                {formData.password && (
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-550 font-medium">Strength: <span className="font-bold">{pwdStrength.label}</span></span>
                                            <span className="text-slate-400">Min 8 characters</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-300 ${pwdStrength.color}`} 
                                                style={{ width: `${pwdStrength.score}%` }} 
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {errors.password && (
                                    <span className="text-xs text-red-500 mt-1 block font-medium">{errors.password}</span>
                                )}
                            </div>

                            {/* Password Confirmation */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="passwordConfirmation">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="passwordConfirmation"
                                        name="passwordConfirmation"
                                        value={formData.passwordConfirmation}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.passwordConfirmation
                                                ? 'border-red-500 focus:ring-red-500/10'
                                                : formData.passwordConfirmation && formData.password === formData.passwordConfirmation
                                                ? 'border-emerald-500 focus:ring-emerald-500/10'
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    {formData.passwordConfirmation && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {formData.password === formData.passwordConfirmation ? (
                                                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-red-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {errors.passwordConfirmation && (
                                    <span className="text-xs text-red-500 mt-1 block font-medium">{errors.passwordConfirmation}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-ui-gold font-serif">III.</span> Billing, Authorizations & Verification
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Review the network subscription costs and upload your verification credentials.</p>
                        </div>

                        {/* Billing Information Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                            <div className="flex gap-4">
                                <div className="p-3 bg-ui-gold/5 border border-ui-gold/25 rounded-xl text-ui-gold h-fit">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Billing & Access Charges Terms</h4>
                                    <div className="text-slate-650 text-sm leading-relaxed space-y-2">
                                        <p>
                                            A monthly deduction of <strong className="text-ui-gold font-semibold">₦1,000</strong> will be made subsequently from salary.
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500">
                                            <li>These charges are subject to change by ITMS Administration.</li>
                                            <li>Minimum of three (3) months notice is required for unsubscribing from the service.</li>
                                            <li>A <strong className="text-slate-700">₦2,000 reactivation fee</strong> applies if access is suspended and re-requested.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Salary Deduction Checkbox */}
                            <div className="mt-6 pt-5 border-t border-slate-200">
                                <label className="flex items-start gap-3 cursor-pointer group select-none">
                                    <div className="relative flex items-center mt-0.5">
                                        <input
                                            type="checkbox"
                                            name="salaryDeductionAuthorized"
                                            checked={formData.salaryDeductionAuthorized}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                                            formData.salaryDeductionAuthorized
                                                ? 'bg-[#2856C3] border-[#2856C3] shadow-sm'
                                                : errors.salaryDeductionAuthorized
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'
                                        }`}>
                                            {formData.salaryDeductionAuthorized && (
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-700 font-medium leading-normal">
                                        I hereby authorize the University of Ibadan Network Unit to deduct the monthly network access fee of <span className="text-ui-gold font-bold">₦1,000</span> directly from my salary. <span className="text-red-505">*</span>
                                    </div>
                                </label>
                                {errors.salaryDeductionAuthorized && (
                                    <span className="text-xs text-red-500 mt-2 block font-medium">{errors.salaryDeductionAuthorized}</span>
                                )}
                            </div>
                        </div>

                        {/* File Uploads Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* University Staff ID Card Photocopy */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-550">
                                    University Staff ID Card <span className="text-red-500">*</span>
                                </label>
                                
                                <div
                                    onDragOver={(e) => handleDragOver(e, 'staffIdFile')}
                                    onDragLeave={() => handleDragLeave('staffIdFile')}
                                    onDrop={(e) => handleDrop(e, 'staffIdFile')}
                                    onClick={() => staffIdInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                                        formData.staffIdFile
                                            ? 'border-emerald-500 bg-emerald-50/20'
                                            : isDragOverStaffId
                                            ? 'border-ui-gold bg-ui-gold/5 ring-4 ring-ui-gold/10'
                                            : errors.staffIdFile
                                            ? 'border-red-400 bg-red-50/20 hover:bg-red-50/40'
                                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-350 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={staffIdInputRef}
                                        onChange={(e) => handleFileChange(e, 'staffIdFile')}
                                        accept="image/jpeg,image/png,application/pdf"
                                        className="hidden"
                                    />

                                    {formData.staffIdFile ? (
                                        <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 truncate max-w-xs mx-auto">
                                                    {formData.staffIdFile.name}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {(formData.staffIdFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile('staffIdFile')}
                                                className="px-3 py-1 bg-red-50 text-red-550 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold tracking-wide transition-all duration-205"
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pointer-events-none">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-405 mx-auto">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                Drag & drop or <span className="text-ui-blue font-bold">browse</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Photocopy of Staff ID card (JPEG, PNG, PDF up to 5MB)
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {errors.staffIdFile && (
                                    <span className="text-xs text-red-500 mt-1 block font-medium">{errors.staffIdFile}</span>
                                )}
                            </div>

                            {/* Recent Payslip Photocopy */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-550">
                                    Recent Payslip Photocopy <span className="text-red-500">*</span>
                                </label>
                                
                                <div
                                    onDragOver={(e) => handleDragOver(e, 'payslipFile')}
                                    onDragLeave={() => handleDragLeave('payslipFile')}
                                    onDrop={(e) => handleDrop(e, 'payslipFile')}
                                    onClick={() => payslipInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                                        formData.payslipFile
                                            ? 'border-emerald-500 bg-emerald-50/20'
                                            : isDragOverPayslip
                                            ? 'border-ui-gold bg-ui-gold/5 ring-4 ring-ui-gold/10'
                                            : errors.payslipFile
                                            ? 'border-red-400 bg-red-50/20 hover:bg-red-50/40'
                                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-350 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={payslipInputRef}
                                        onChange={(e) => handleFileChange(e, 'payslipFile')}
                                        accept="image/jpeg,image/png,application/pdf"
                                        className="hidden"
                                    />

                                    {formData.payslipFile ? (
                                        <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 truncate max-w-xs mx-auto">
                                                    {formData.payslipFile.name}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {(formData.payslipFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile('payslipFile')}
                                                className="px-3 py-1 bg-red-50 text-red-550 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold tracking-wide transition-all duration-205"
                                            >
                                                Remove File
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pointer-events-none">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-405 mx-auto">
                                                <svg className="w-6 h-6 text-slate-405" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                Drag & drop or <span className="text-ui-blue font-bold">browse</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                Photocopy of recent official payslip (JPEG, PNG, PDF up to 5MB)
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {errors.payslipFile && (
                                    <span className="text-xs text-red-500 mt-1 block font-medium">{errors.payslipFile}</span>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-ui-gold font-serif">IV.</span> Application Summary Review
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Verify all registration details before finalizing submission to the ITMS Network Unit.</p>
                        </div>

                        {/* Review Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-55/60 border border-slate-200/80 rounded-2xl p-6 sm:p-8">
                            
                            {/* Personal Summary */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-205 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ui-gold">Personal Information</h4>
                                    <button 
                                        type="button" 
                                        onClick={() => setCurrentStep(1)} 
                                        className="text-xs text-ui-blue hover:underline font-bold"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Full Name:</span>
                                        <span className="text-slate-800 font-semibold">{formData.fullName}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Staff ID:</span>
                                        <span className="text-slate-800 font-mono font-semibold tracking-wide">{formData.staffId}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Designation:</span>
                                        <span className="text-slate-800 font-semibold">{formData.designation}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Phone No:</span>
                                        <span className="text-slate-800 font-semibold">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Faculty/Unit:</span>
                                        <span className="text-slate-800 font-semibold text-right max-w-[200px] truncate">{formData.faculty}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">Department:</span>
                                        <span className="text-slate-800 font-semibold text-right max-w-[200px] truncate">{formData.department}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Security & System Info */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-205 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ui-gold">System Credentials</h4>
                                    <button 
                                        type="button" 
                                        onClick={() => setCurrentStep(2)} 
                                        className="text-xs text-ui-blue hover:underline font-bold"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Preferred Username:</span>
                                        <span className="text-ui-blue font-bold font-mono">@{formData.username}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Initial Password:</span>
                                        <span className="text-slate-500 font-mono">•••••••• (Hidden)</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Staff ID Document:</span>
                                        <span className="text-emerald-600 font-semibold truncate max-w-[180px]">{formData.staffIdFile?.name}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Payslip Document:</span>
                                        <span className="text-emerald-600 font-semibold truncate max-w-[180px]">{formData.payslipFile?.name}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-slate-400">Salary Authorization:</span>
                                        <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Authorized ✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Agreement Declaration box */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 items-start">
                            <div className="w-5 h-5 text-ui-gold flex-shrink-0 mt-0.5">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                By submitting this form, you request network activation under the rules of the ITMS department, University of Ibadan. The registered details will be verified against the uploaded University ID Card and Payslip. You will receive an activation email once verification completes.
                            </p>
                        </div>
                    </div>
                )}

                {currentStep === 5 && submissionResult && (
                    <div className="space-y-6 text-center py-8 px-4 animate-scaleUp">
                        <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-800 font-serif">Registration Submitted</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">{submissionResult.message}</p>
                        </div>

                        {/* Submission Ticket Badge */}
                        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-left shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                            
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Application Reference</span>
                                <span className="text-sm font-mono font-bold text-ui-gold tracking-wider">{submissionResult.reference}</span>
                            </div>
                            
                            {submissionResult.sentData && (
                                <div className="space-y-2.5 text-xs text-slate-650">
                                    <div className="flex justify-between">
                                        <span>Registrant:</span>
                                        <strong className="text-slate-800 font-semibold">{submissionResult.sentData.fullName}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Staff ID No:</span>
                                        <strong className="text-slate-800 font-mono">{submissionResult.sentData.staffId}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Allocated Username:</span>
                                        <strong className="text-ui-blue font-mono">@{submissionResult.sentData.username}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Unit/Department:</span>
                                        <span className="text-slate-700 font-semibold truncate max-w-[200px]">{submissionResult.sentData.department}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Portal Access Status:</span>
                                        <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                            Pending Verification
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Print Receipt & Reset Options */}
                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print Confirmation
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 bg-ui-blue hover:bg-blue-800 text-white rounded-xl text-sm font-bold tracking-wide shadow-md transition-all duration-200 cursor-pointer"
                            >
                                Register Another Staff Member
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation Buttons */}
                {currentStep <= 4 && (
                    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between items-center pt-8 mt-8 border-t border-slate-300">
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border border-slate-300 flex items-center justify-center gap-2 group cursor-pointer"
                            >
                                <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                        ) : (
                            <div className="hidden sm:block w-1" />
                        )}

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full sm:w-auto px-6 py-3 bg-[#2856C3] hover:bg-blue-800 text-white rounded-xl text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
                            >
                                Next Step
                                <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-8 py-3 bg-[#2856C3] hover:bg-blue-800 text-white rounded-xl text-sm font-bold tracking-wide shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Submitting Application...
                                    </>
                                ) : (
                                    <>
                                        Submit Registration
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
