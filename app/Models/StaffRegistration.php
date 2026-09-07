<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffRegistration extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_IN_REVIEW = 'in_review';

    public const STATUS_COMPLETED = 'completed';

    public const ALLOWED_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_IN_REVIEW,
        self::STATUS_COMPLETED,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'full_name',
        'staff_id',
        'role',
        'designation',
        'phone',
        'faculty',
        'department',
        'username',
        'email',
        'password',
        'default_password_text',
        'salary_deduction_authorized',
        'staff_id_file',
        'payslip_file',
        'tracking_id',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'preferred_password',
        'is_editable',
    ];

    /**
     * Default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => self::STATUS_PENDING,
    ];

    /**
     * Get unhashed preferred password for admin visibility.
     */
    public function getPreferredPasswordAttribute(): ?string
    {
        return $this->default_password_text;
    }

    /**
     * Indicates whether the registration may still be edited.
     */
    public function getIsEditableAttribute(): bool
    {
        return $this->status !== self::STATUS_COMPLETED;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'salary_deduction_authorized' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * Messages thread belonging to this registration.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(RegistrationMessage::class)->orderBy('created_at');
    }

    /**
     * Generate a clean, unique 8-character tracking code such as "UIN-7X9B2K".
     * Characters are drawn from uppercase letters and digits only, with the
     * letters 0/1, I/O removed to keep the code easy to read.
     */
    public static function generateTrackingId(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/I/O
        do {
            $suffix = '';
            for ($i = 0; $i < 6; $i++) {
                $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $code = 'UIN-'.$suffix;
        } while (self::where('tracking_id', $code)->exists());

        return $code;
    }
}
