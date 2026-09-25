import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import ImagePreviewModal from './ImagePreviewModal';
import type { TrackedRegistration } from './TrackingLookup';
import { IMAGE_ACCEPT, validateImageFile } from '../utils/imageUpload';

// ==========================================
// 1. TypeScript Interfaces
// ==========================================
export interface RegistrationFormData {
    // Personal Profile
    role: 'staff' | 'dean' | 'hod' | 'director' | '';
    fullName: string;
    staffId: string;
    designation: 'Academic' | 'Non-Teaching' | '';
    phone: string;
    contactEmail: string;
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
    role?: string;
    fullName?: string;
    staffId?: string;
    designation?: string;
    phone?: string;
    contactEmail?: string;
    faculty?: string;
    department?: string;
    username?: string;
    password?: string;
    passwordConfirmation?: string;
    salaryDeductionAuthorized?: string;
    staffIdFile?: string;
    payslipFile?: string;
}

export default function RegistrationForm({
    editRegistration = null,
    onCancelEdit,
    onEditSaved,
    onGoToTracking,
}: {
    editRegistration?: TrackedRegistration | null;
    onCancelEdit?: () => void;
    onEditSaved?: () => void;
    /** Opens the tracking dashboard; only invoked when the user asks to from the success screen. */
    onGoToTracking?: (trackingId: string) => void;
} = {}) {
    // ==========================================
    // 2. State & References
    // ==========================================
    const isEditMode = !!editRegistration;
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [formData, setFormData] = useState<RegistrationFormData>(() => {
        if (editRegistration) {
            return {
                role: (editRegistration.role as RegistrationFormData['role']) || '',
                fullName: editRegistration.full_name || '',
                staffId: editRegistration.staff_id || '',
                designation: (editRegistration.designation as RegistrationFormData['designation']) || '',
                phone: editRegistration.phone || '',
                contactEmail: editRegistration.contact_email || '',
                faculty: editRegistration.faculty || '',
                department: editRegistration.department || '',
                username: editRegistration.username || '',
                password: '',
                passwordConfirmation: '',
                salaryDeductionAuthorized: !!editRegistration.salary_deduction_authorized,
                staffIdFile: null,
                payslipFile: null,
            };
        }
        return {
            role: '',
            fullName: '',
            staffId: '',
            designation: '',
            phone: '',
            contactEmail: '',
            faculty: '',
            department: '',
            username: '',
            password: '',
            passwordConfirmation: '',
            salaryDeductionAuthorized: false,
            staffIdFile: null,
            payslipFile: null,
        };
    });

    const [errors, setErrors] = useState<ValidationErrors>({});
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showSummaryPassword, setShowSummaryPassword] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submissionResult, setSubmissionResult] = useState<{
        success: boolean;
        reference?: string;
        trackingId?: string;
        message?: string;
        sentData?: Record<string, string>;
    } | null>(null);
    const [previewImage, setPreviewImage] = useState<{ src: string; title: string; description?: string } | null>(null);
    const [staffIdPreviewUrl, setStaffIdPreviewUrl] = useState<string | null>(null);
    const [payslipPreviewUrl, setPayslipPreviewUrl] = useState<string | null>(null);
    const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

    // File Input Refs
    const staffIdInputRef = useRef<HTMLInputElement>(null);
    const payslipInputRef = useRef<HTMLInputElement>(null);

    // Drag-over States
    const [isDragOverStaffId, setIsDragOverStaffId] = useState<boolean>(false);
    const [isDragOverPayslip, setIsDragOverPayslip] = useState<boolean>(false);

    // Object URL previews for selected image files
    useEffect(() => {
        if (!formData.staffIdFile) {
            setStaffIdPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(formData.staffIdFile);
        setStaffIdPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [formData.staffIdFile]);

    useEffect(() => {
        if (!formData.payslipFile) {
            setPayslipPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(formData.payslipFile);
        setPayslipPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [formData.payslipFile]);

    const openStaffIdPreview = () => {
        if (staffIdPreviewUrl) {
            setPreviewImage({
                src: staffIdPreviewUrl,
                title: 'Staff ID Card',
                description: formData.staffIdFile?.name,
            });
        }
    };

    const openPayslipPreview = () => {
        if (payslipPreviewUrl) {
            setPreviewImage({
                src: payslipPreviewUrl,
                title: 'Recent Payslip',
                description: formData.payslipFile?.name,
            });
        }
    };

    const copyTrackingId = async (id: string) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(id);
            } else {
                const ta = document.createElement('textarea');
                ta.value = id;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopiedTracking(true);
            setTimeout(() => setCopiedTracking(false), 2000);
        } catch {
            // ignore
        }
    };

    // ==========================================
    // 3. Validation Logic
    // ==========================================
    const validateUsername = (val: string): boolean => {
        return /^[a-z0-9._-]+$/.test(val.trim());
    };

    const validateStaffId = (val: string): boolean => {
        const regex = /^UI\/STF\/\d+$/;
        return regex.test(val.trim());
    };

    const validatePhone = (val: string): boolean => {
        const regex = /^(?:\+234|0)[789][01]\d{8}$/;
        return regex.test(val.replace(/\s+/g, ''));
    };

    const validateEmail = (val: string): boolean => {
        // Mirrors the backend `email` rule: a single @, no whitespace, and a
        // dotted domain.
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(val.trim());
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

        if (step === 0) {
            if (!formData.role) {
                newErrors.role = 'Please select your institutional role to continue.';
            }
        }

        if (step === 1) {
            if (!formData.fullName.trim()) {
                newErrors.fullName = 'Full Name is required.';
            } else if (formData.fullName.trim().length < 3) {
                newErrors.fullName = 'Name must be at least 3 characters.';
            }

            if (!formData.staffId.trim()) {
                newErrors.staffId = 'Staff ID No. is required.';
            } else if (!validateStaffId(formData.staffId)) {
                newErrors.staffId = 'Invalid format. Use "UI/STF/[Numbers]" (e.g., UI/STF/1234).';
            }

            if (!formData.phone.trim()) {
                newErrors.phone = 'Phone number is required.';
            } else if (!validatePhone(formData.phone)) {
                newErrors.phone = 'Invalid phone number. Must be a valid Nigerian number (e.g. 08031234567).';
            }

            if (!formData.contactEmail.trim()) {
                newErrors.contactEmail = 'Contact email is required.';
            } else if (!validateEmail(formData.contactEmail)) {
                newErrors.contactEmail = 'Enter a valid email address (e.g. name@example.com).';
            }

            if (formData.role === 'staff') {
                if (!formData.designation) {
                    newErrors.designation = 'Please select your designation.';
                }
                if (!formData.faculty.trim()) {
                    newErrors.faculty = 'Faculty / Main Unit is required.';
                }
                if (!formData.department.trim()) {
                    newErrors.department = 'Department is required.';
                }
            } else if (formData.role === 'dean') {
                if (!formData.faculty.trim()) {
                    newErrors.faculty = 'Faculty is required.';
                }
            } else if (formData.role === 'hod') {
                if (!formData.faculty.trim()) {
                    newErrors.faculty = 'Faculty is required.';
                }
                if (!formData.department.trim()) {
                    newErrors.department = 'Department is required.';
                }
            } else if (formData.role === 'director') {
                if (!formData.department.trim()) {
                    newErrors.department = 'Main Unit / Directorate Unit is required.';
                }
            }
        }

        if (step === 2) {
            if (!isEditMode) {
                if (!formData.username.trim()) {
                    newErrors.username = 'Preferred Username is required.';
                } else if (!validateUsername(formData.username)) {
                    newErrors.username = 'Username must contain only lowercase letters, numbers, dots, hyphens, and underscores.';
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
        }

        if (step === 3) {
            if (!isEditMode && !formData.salaryDeductionAuthorized) {
                newErrors.salaryDeductionAuthorized = 'You must authorize the salary deduction to proceed.';
            }

            if (!isEditMode && !formData.staffIdFile) {
                newErrors.staffIdFile = 'Staff ID card photocopy is required.';
            }

            if (!isEditMode && !formData.payslipFile) {
                newErrors.payslipFile = 'Recent payslip photocopy is required.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateAllSteps = (): boolean => {
        const isStep0Valid = validateStep(0);
        if (!isStep0Valid) {
            setCurrentStep(0);
            return false;
        }
        const isStep1Valid = validateStep(1);
        if (!isStep1Valid) {
            setCurrentStep(1);
            return false;
        }
        const isStep2Valid = validateStep(2);
        if (!isStep2Valid) {
            setCurrentStep(2);
            return false;
        }
        const isStep3Valid = validateStep(3);
        if (!isStep3Valid) {
            setCurrentStep(3);
            return false;
        }
        return true;
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

    /**
     * Validate a picked/dropped file immediately. An invalid file is never
     * stored: the field and the underlying <input> are reset and an inline
     * error is shown, so it cannot slip through to submission.
     */
    const acceptFile = (file: File | null, fieldName: 'staffIdFile' | 'payslipFile') => {
        if (!file) return;

        const inputRef = fieldName === 'staffIdFile' ? staffIdInputRef : payslipInputRef;
        const error = validateImageFile(file);

        if (error) {
            if (inputRef.current) inputRef.current.value = '';
            setFormData((prev) => ({ ...prev, [fieldName]: null }));
            setErrors((prev) => ({ ...prev, [fieldName]: error }));
            return;
        }

        setFormData((prev) => ({ ...prev, [fieldName]: file }));
        setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldName: 'staffIdFile' | 'payslipFile') => {
        acceptFile(e.target.files?.[0] || null, fieldName);
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

        acceptFile(e.dataTransfer.files?.[0] || null, fieldName);
    };

    const removeFile = (fieldName: 'staffIdFile' | 'payslipFile') => {
        const inputRef = fieldName === 'staffIdFile' ? staffIdInputRef : payslipInputRef;
        if (inputRef.current) inputRef.current.value = '';
        setFormData((prev) => ({
            ...prev,
            [fieldName]: null,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAllSteps()) return;

        setIsSubmitting(true);
        setErrors({});
        setSubmissionResult(null);

        try {
            const isUpdate = isEditMode && editRegistration;
            const url = isUpdate ? `/api/registrations/${editRegistration!.id}` : '/api/register';
            const method = isUpdate ? 'PUT' : 'POST';

            const submissionData = new FormData();

            submissionData.append('role', formData.role);
            submissionData.append('fullName', formData.fullName.trim());
            submissionData.append('staffId', formData.staffId.trim());
            submissionData.append('designation', formData.role === 'staff' ? formData.designation : '');
            submissionData.append('phone', formData.phone.trim());
            submissionData.append('contactEmail', formData.contactEmail.trim());
            submissionData.append('faculty', ['staff', 'dean', 'hod'].includes(formData.role) ? formData.faculty.trim() : '');
            submissionData.append('department', ['staff', 'hod', 'director'].includes(formData.role) ? formData.department.trim() : '');
            if (!isUpdate) {
                submissionData.append('username', formData.username.trim());
                submissionData.append('password', formData.password);
                submissionData.append('salaryDeductionAuthorized', formData.salaryDeductionAuthorized ? '1' : '0');
            } else {
                submissionData.append('salaryDeductionAuthorized', formData.salaryDeductionAuthorized ? '1' : '0');
            }

            if (formData.staffIdFile) {
                submissionData.append('staffIdFile', formData.staffIdFile);
            }
            if (formData.payslipFile) {
                submissionData.append('payslipFile', formData.payslipFile);
            }

            const response = await fetch(url, {
                method,
                body: submissionData,
                headers: {
                    'Accept': 'application/json',
                }
            });

            let result: any = null;
            try {
                result = await response.json();
            } catch (jsonErr) {
                throw new Error(`Server returned an invalid response (HTTP ${response.status} ${response.statusText || 'Error'}). Please try again.`);
            }

            if (response.ok && (result?.success || isUpdate)) {
                if (isUpdate) {
                    setSubmissionResult({
                        success: true,
                        message: result?.message || 'Your application has been updated successfully.',
                        trackingId: editRegistration!.tracking_id,
                    });
                    setCurrentStep(5);
                    if (onEditSaved) onEditSaved();
                } else {
                    const trackingId = result.tracking_id || result.reference;
                    setSubmissionResult({
                        success: true,
                        reference: result.reference,
                        trackingId,
                        message: result.message,
                        sentData: result.sentData,
                    });
                    // Stay on the success screen; the user opens the tracking
                    // dashboard explicitly via "Go to Tracking Page".
                    setCurrentStep(5);
                }
            } else if (response.status === 403) {
                setSubmissionResult({
                    success: false,
                    message: result?.message || 'This application is locked and can no longer be edited.',
                });
            } else {
                if (result?.errors && typeof result.errors === 'object') {
                    const validationErrors: ValidationErrors = {};
                    Object.keys(result.errors).forEach((key) => {
                        const messages = result.errors[key];
                        validationErrors[key as keyof ValidationErrors] = Array.isArray(messages) ? messages[0] : String(messages);
                    });
                    setErrors(validationErrors);

                    // Redirect back to the first step containing errors
                    if (validationErrors.role) {
                        setCurrentStep(0);
                    } else if (
                        validationErrors.fullName ||
                        validationErrors.staffId ||
                        validationErrors.designation ||
                        validationErrors.phone ||
                        validationErrors.contactEmail ||
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
                        message: result.message || 'Validation failed. Please correct the highlighted errors.',
                    });
                } else {
                    setSubmissionResult({
                        success: false,
                        message: result?.message || `Submission failed with status ${response.status}. Please check your inputs.`,
                    });
                }
            }
        } catch (err: any) {
            setSubmissionResult({
                success: false,
                message: err?.message || 'A network error occurred while submitting your registration. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            role: '',
            fullName: '',
            staffId: '',
            designation: '',
            phone: '',
            contactEmail: '',
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
        setCurrentStep(0);
    };

    const pwdStrength = getPasswordStrength(formData.password);

    return (
        <div className="w-full max-w-4xl bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden relative">

            {/* Step Wizard Progress Bar */}
            {currentStep >= 1 && currentStep <= 4 && (
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
                {/* Submission Error Banner */}
                {submissionResult && !submissionResult.success && currentStep < 5 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 animate-fadeIn">
                        <div className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">Submission Error</h4>
                            <p className="text-xs font-medium mt-0.5 text-red-700 leading-relaxed">{submissionResult.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSubmissionResult(null)}
                            className="text-red-400 hover:text-red-700 text-sm font-bold leading-none p-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {currentStep === 0 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="text-center max-w-2xl mx-auto space-y-2">
                            <h3 className="text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
                                {isEditMode ? 'Edit Institutional Role' : 'Select Your Institutional Role'}
                            </h3>
                            <p className="text-slate-500 text-sm">
                                {isEditMode
                                    ? 'You can review and update your role below before continuing.'
                                    : 'Please select your primary organizational role to customize the network registry application flow.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            {/* Staff Card */}
                            <div 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, role: 'staff' }));
                                    setErrors(prev => ({ ...prev, role: undefined }));
                                }}
                                className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden ${
                                    formData.role === 'staff'
                                        ? 'border-[#2856C3] bg-blue-50/20 shadow-md ring-4 ring-[#2856C3]/10'
                                        : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-sm hover:scale-[1.02]'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl ${formData.role === 'staff' ? 'bg-[#2856C3] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    {formData.role === 'staff' && (
                                        <div className="w-5 h-5 rounded-full bg-[#2856C3] text-white flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-base font-bold text-slate-800">Staff Member</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Academic or Non-Teaching staff members affiliated with a specific faculty/department.
                                    </p>
                                </div>
                            </div>

                            {/* Dean Card */}
                            <div 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, role: 'dean' }));
                                    setErrors(prev => ({ ...prev, role: undefined }));
                                }}
                                className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden ${
                                    formData.role === 'dean'
                                        ? 'border-[#2856C3] bg-blue-50/20 shadow-md ring-4 ring-[#2856C3]/10'
                                        : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-sm hover:scale-[1.02]'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl ${formData.role === 'dean' ? 'bg-[#2856C3] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                                            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                        </svg>
                                    </div>
                                    {formData.role === 'dean' && (
                                        <div className="w-5 h-5 rounded-full bg-[#2856C3] text-white flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-base font-bold text-slate-800">Faculty Dean</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Institutional administrator overseeing faculty-level administrative and academic decisions.
                                    </p>
                                </div>
                            </div>

                            {/* HOD Card */}
                            <div 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, role: 'hod' }));
                                    setErrors(prev => ({ ...prev, role: undefined }));
                                }}
                                className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden ${
                                    formData.role === 'hod'
                                        ? 'border-[#2856C3] bg-blue-50/20 shadow-md ring-4 ring-[#2856C3]/10'
                                        : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-sm hover:scale-[1.02]'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl ${formData.role === 'hod' ? 'bg-[#2856C3] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    {formData.role === 'hod' && (
                                        <div className="w-5 h-5 rounded-full bg-[#2856C3] text-white flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-base font-bold text-slate-800">Head of Department (HOD)</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Academic leader managing departmental operations, staff, and student progress.
                                    </p>
                                </div>
                            </div>

                            {/* Director Card */}
                            <div 
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, role: 'director' }));
                                    setErrors(prev => ({ ...prev, role: undefined }));
                                }}
                                className={`group p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden ${
                                    formData.role === 'director'
                                        ? 'border-[#2856C3] bg-blue-50/20 shadow-md ring-4 ring-[#2856C3]/10'
                                        : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-sm hover:scale-[1.02]'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-xl ${formData.role === 'director' ? 'bg-[#2856C3] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    {formData.role === 'director' && (
                                        <div className="w-5 h-5 rounded-full bg-[#2856C3] text-white flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-base font-bold text-slate-800">Director</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Executive director leading a specialized institutional directorate or main operational unit.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {errors.role && (
                            <p className="text-sm text-red-500 text-center font-medium mt-4">{errors.role}</p>
                        )}
                    </div>
                )}
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
                                                  {/* Designation (Only for Staff) */}
                            {formData.role === 'staff' && (
                                <div className="flex flex-col gap-1.5 animate-fadeIn">
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
                            )}
 
                            {/* Phone No (Always Visible) */}
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

                            {/* Contact Email (Always Visible) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="contactEmail">
                                    Contact Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        id="contactEmail"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 ${
                                            errors.contactEmail
                                                ? 'border-red-500 focus:ring-red-500/10'
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. name@example.com"
                                    />
                                    {errors.contactEmail && (
                                        <span className="text-xs text-red-500 mt-1 block font-medium">{errors.contactEmail}</span>
                                    )}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                    Used to reach you about this application. Your official UI email is generated from your username later.
                                </span>
                            </div>

                            {/* Faculty / Unit (For Staff, Dean, HOD) */}
                            {['staff', 'dean', 'hod'].includes(formData.role) && (
                                <div className="flex flex-col gap-1.5 animate-fadeIn">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="faculty">
                                        Faculty / Unit <span className="text-red-500">*</span>
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
                            )}
 
                            {/* Department / Main Unit (For Staff, HOD, Director) */}
                            {['staff', 'hod', 'director'].includes(formData.role) && (
                                <div className="flex flex-col gap-1.5 animate-fadeIn">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="department">
                                        {formData.role === 'director' ? 'Directorate Unit / Main Unit' : 'Department'} <span className="text-red-500">*</span>
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
                                            placeholder={formData.role === 'director' ? 'e.g. ICT Directorate' : 'e.g. Computer Science'}
                                        />
                                        {errors.department && (
                                            <span className="text-xs text-red-500 mt-1 block font-medium">{errors.department}</span>
                                        )}
                                    </div>
                                </div>
                            )}        </div>
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
                                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                        Lowercase only
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        className={`w-full px-4 pr-12 py-3 bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all duration-200 lowercase ${
                                            errors.username
                                                ? 'border-red-500 focus:ring-red-500/10'
                                                : formData.username && validateUsername(formData.username)
                                                ? 'border-emerald-500 focus:ring-emerald-500/10'
                                                : 'border-slate-200 focus:border-[#2856C3] focus:ring-[#2856C3]'
                                        }`}
                                        placeholder="e.g. john.doe"
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
                                <span className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                    Username will be used for your official network account (e.g. <span className="text-slate-700 font-semibold">jbrown</span>, <span className="text-slate-700 font-semibold">olusola</span>).
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
                                            {['staff', 'director'].includes(formData.role) ? (
                                                <>A monthly deduction of <strong className="text-ui-gold font-semibold">₦1,000</strong> would be made subsequently.</>
                                            ) : (
                                                <>A monthly deduction of <strong className="text-ui-gold font-semibold">₦2,000</strong> would be made subsequently.</>
                                            )}
                                        </p>
                                        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500">
                                            <li>These charges are subject to change by ITEMS Administration.</li>
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
                                        I hereby authorize the University of Ibadan Network Unit to deduct the monthly network access fee of <span className="text-ui-gold font-bold">{['staff', 'director'].includes(formData.role) ? '₦1,000' : '₦2,000'}</span> directly from my salary. <span className="text-red-500">*</span>
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
                                        accept={IMAGE_ACCEPT}
                                        className="hidden"
                                    />

                                    {formData.staffIdFile ? (
                                        <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={openStaffIdPreview}
                                                className="block mx-auto group relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm hover:border-[#2856C3] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#2856C3]/30"
                                                title="Click to preview"
                                            >
                                                {staffIdPreviewUrl ? (
                                                    <img
                                                        src={staffIdPreviewUrl}
                                                        alt="Staff ID preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                                    </svg>
                                                </div>
                                            </button>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 truncate max-w-xs mx-auto">
                                                    {formData.staffIdFile.name}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {(formData.staffIdFile.size / 1024 / 1024).toFixed(2)} MB · Click thumbnail to preview
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={openStaffIdPreview}
                                                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile('staffIdFile')}
                                                    className="px-3 py-1 bg-red-50 text-red-550 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                                                >
                                                    Remove File
                                                </button>
                                            </div>
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
                                                Photocopy of Staff ID card (JPEG or PNG, up to 5MB)
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
                                        accept={IMAGE_ACCEPT}
                                        className="hidden"
                                    />

                                    {formData.payslipFile ? (
                                        <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={openPayslipPreview}
                                                className="block mx-auto group relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm hover:border-[#2856C3] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#2856C3]/30"
                                                title="Click to preview"
                                            >
                                                {payslipPreviewUrl ? (
                                                    <img
                                                        src={payslipPreviewUrl}
                                                        alt="Payslip preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                                    </svg>
                                                </div>
                                            </button>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 truncate max-w-xs mx-auto">
                                                    {formData.payslipFile.name}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {(formData.payslipFile.size / 1024 / 1024).toFixed(2)} MB · Click thumbnail to preview
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={openPayslipPreview}
                                                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile('payslipFile')}
                                                    className="px-3 py-1 bg-red-50 text-red-550 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                                                >
                                                    Remove File
                                                </button>
                                            </div>
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
                                                Photocopy of recent official payslip (JPEG or PNG, up to 5MB)
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
                            <p className="text-slate-500 text-sm mt-1">Verify all registration details before finalizing submission to the ITEMS Network Unit.</p>
                        </div>

                        {isEditMode && editRegistration && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-900">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <div className="text-xs font-medium leading-relaxed">
                                    Editing existing application <span className="font-mono font-bold tracking-wider">{editRegistration.tracking_id}</span>. Documents and password remain unchanged unless replaced.
                                </div>
                            </div>
                        )}

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
                                        <span className="text-slate-400">Institutional Role:</span>
                                        <span className="text-slate-805 font-bold capitalize">{formData.role}</span>
                                    </div>
                                    {formData.role === 'staff' && formData.designation && (
                                        <div className="flex justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-400">Designation:</span>
                                            <span className="text-slate-800 font-semibold">{formData.designation}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Phone No:</span>
                                        <span className="text-slate-800 font-semibold">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Contact Email:</span>
                                        <span className="text-slate-800 font-semibold text-right max-w-[200px] truncate">{formData.contactEmail}</span>
                                    </div>
                                    {['staff', 'dean', 'hod'].includes(formData.role) && (
                                        <div className="flex justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-400">Faculty/Unit:</span>
                                            <span className="text-slate-800 font-semibold text-right max-w-[200px] truncate">{formData.faculty}</span>
                                        </div>
                                    )}
                                    {['staff', 'hod', 'director'].includes(formData.role) && (
                                        <div className="flex justify-between py-1">
                                            <span className="text-slate-400">{formData.role === 'director' ? 'Directorate / Unit:' : 'Department:'}</span>
                                            <span className="text-slate-800 font-semibold text-right max-w-[200px] truncate">{formData.department}</span>
                                        </div>
                                    )}
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
                                        <span className="text-ui-blue font-bold font-mono">{formData.username}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Initial Password:</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-slate-500 font-mono">
                                                {!formData.password
                                                    ? '•••••••• (Hidden)'
                                                    : showSummaryPassword
                                                    ? formData.password
                                                    : '••••••••'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowSummaryPassword((v) => !v)}
                                                className="text-slate-400 hover:text-[#2856C3] focus:outline-none focus:ring-2 focus:ring-[#2856C3]/20 rounded p-1 transition-colors"
                                                aria-label={showSummaryPassword ? 'Hide password' : 'Show password'}
                                                title={showSummaryPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showSummaryPassword ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </span>
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
                                By submitting this form, you request network activation under the rules of the ITEMS department, University of Ibadan. The registered details will be verified against the uploaded University ID Card and Payslip. You will receive an activation email once verification completes.
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

                        {/* Tracking ID Callout */}
                        {submissionResult.trackingId && (
                            <div className="max-w-md mx-auto bg-gradient-to-br from-[#2856C3] to-blue-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-ui-gold/20 rounded-full blur-2xl pointer-events-none" />
                                <div className="relative space-y-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4 text-ui-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h2a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h2m2-2h6a2 2 0 012 2v2H7V5a2 2 0 012-2zm0 0V3m0 2h6m-6 0H7" />
                                        </svg>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Your Tracking ID</p>
                                    </div>
                                    <p className="font-mono text-3xl sm:text-4xl font-extrabold tracking-[0.15em] text-white select-all">
                                        {submissionResult.trackingId}
                                    </p>
                                    <p className="text-[11px] text-blue-100 max-w-xs mx-auto leading-relaxed">
                                        Save this ID. Use it on the homepage to track your application status, edit your details, and chat with ITEMS.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => copyTrackingId(submissionResult.trackingId!)}
                                            className="px-4 py-2 bg-white text-[#2856C3] hover:bg-slate-50 rounded-lg text-xs font-bold tracking-wide shadow-sm transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            {copiedTracking ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Copy Tracking ID
                                                </>
                                            )}
                                        </button>
                                        {/* Primary next step: open the tracking dashboard (only on click) */}
                                        {onGoToTracking && (
                                            <button
                                                type="button"
                                                onClick={() => onGoToTracking(submissionResult.trackingId!)}
                                                className="px-4 py-2 bg-ui-gold hover:brightness-95 text-slate-900 rounded-lg text-xs font-bold tracking-wide shadow-sm transition-all flex items-center justify-center gap-1.5 group"
                                            >
                                                Go to Tracking Page
                                                <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submission Ticket Badge */}
                        {submissionResult.sentData && (
                            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-left shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

                                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Application Reference</span>
                                    <span className="text-sm font-mono font-bold text-ui-gold tracking-wider">{submissionResult.reference || '—'}</span>
                                </div>

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
                                        <strong className="text-ui-blue font-mono">{submissionResult.sentData.username}</strong>
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
                            </div>
                        )}

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
                                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                Register Another Staff Member
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation Buttons */}
                {currentStep <= 4 && (
                    <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between items-center pt-8 mt-8 border-t border-slate-300">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {currentStep > 0 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border border-slate-300 flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                            ) : (
                                <div className="hidden sm:block w-1" />
                            )}

                            {isEditMode && onCancelEdit && (
                                <button
                                    type="button"
                                    onClick={onCancelEdit}
                                    className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

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
                                        {isEditMode ? 'Saving Changes...' : 'Submitting Application...'}
                                    </>
                                ) : (
                                    <>
                                        {isEditMode ? 'Save Changes' : 'Submit Registration'}
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ImagePreviewModal
                open={!!previewImage}
                src={previewImage?.src ?? null}
                title={previewImage?.title}
                description={previewImage?.description}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    );
}
