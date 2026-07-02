import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

// Get the encryption key from environment variables or use a secure fallback for dev
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-dev-secret-key-32-chars-long-at-least!'
  // Hash the secret to ensure it is exactly 32 bytes
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return ''
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt token.')
  }
}

/**
 * Decrypts a string encrypted with encrypt()
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    const parts = encryptedText.split(':')
    const ivHex = parts.shift()
    const encryptedHex = parts.join(':')
    if (!ivHex || !encryptedHex) {
      // Fallback for unencrypted tokens (e.g. if key was change or DB has legacy items)
      return encryptedText
    }
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    // Fallback to the raw string if decryption fails (so that plain text during testing works)
    return encryptedText
  }
}
