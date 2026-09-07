<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationMessage extends Model
{
    use HasFactory;

    public const SENDER_USER = 'user';

    public const SENDER_ADMIN = 'admin';

    public const ALLOWED_SENDERS = [self::SENDER_USER, self::SENDER_ADMIN];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'staff_registration_id',
        'sender_type',
        'message',
        'attachment_path',
    ];

    /**
     * Get the registration that owns this message.
     */
    public function registration(): BelongsTo
    {
        return $this->belongsTo(StaffRegistration::class, 'staff_registration_id');
    }
}
