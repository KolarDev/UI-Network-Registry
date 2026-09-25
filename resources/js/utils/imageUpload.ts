/**
 * Client-side mirror of the backend upload rules
 * (`mimes:jpg,jpeg,png` + `max:5120` in RegistrationController).
 *
 * This only gives instant feedback; the server still re-validates the actual
 * file contents, so it is not a security boundary.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
export const MAX_IMAGE_BYTES = 5120 * 1024; // 5MB

/** Value for an `<input type="file" accept>` attribute. */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png';

/**
 * Returns an error message when the file is not an acceptable image, or null
 * when it may be uploaded.
 */
export function validateImageFile(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    // Some browsers/OSes report an empty MIME type; fall back to the extension.
    const typeOk = file.type
        ? ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())
        : ALLOWED_IMAGE_EXTENSIONS.includes(extension);

    if (!typeOk) {
        return `"${file.name}" is not a supported image. Only JPEG or PNG files are accepted.`;
    }

    if (file.size > MAX_IMAGE_BYTES) {
        const sizeMb = (file.size / 1024 / 1024).toFixed(2);
        return `"${file.name}" is ${sizeMb}MB. The maximum allowed size is 5MB.`;
    }

    return null;
}
