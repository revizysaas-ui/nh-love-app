export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin.trim().toLowerCase())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(input, storedHash) {
  const inputHash = await hashPin(input)
  return inputHash === storedHash
}
