export interface PhoneValidationResult {
  isValid: boolean
  normalized: string | null
  reason: string | null
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export function normalizePakistaniPhone(phone?: string | null): string | null {
  if (!phone) return null
  const digits = normalizePhoneDigits(phone)

  if (/^03\d{9}$/.test(digits)) return `92${digits.slice(1)}`
  if (/^3\d{9}$/.test(digits)) return `92${digits}`
  if (/^923\d{9}$/.test(digits)) return digits
  if (/^00923\d{9}$/.test(digits)) return digits.slice(2)

  return null
}

export function validatePakistaniPhone(phone?: string | null): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: false, normalized: null, reason: 'Number is missing' }
  }

  const normalized = normalizePakistaniPhone(phone)
  if (!normalized) {
    return {
      isValid: false,
      normalized: null,
      reason: 'Use Pakistani mobile format like 03XXXXXXXXX',
    }
  }

  return { isValid: true, normalized, reason: null }
}

export function formatPakistaniPhone(normalized?: string | null): string {
  if (!normalized) return '-'
  const value = normalizePakistaniPhone(normalized)
  if (!value) return normalized
  return `+${value}`
}
