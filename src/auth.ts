/**
 * Simple authentication utilities
 */

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createSessionCookie(token: string): string {
  // Cookie expires in 24 hours
  const maxAge = 60 * 60 * 24;
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
}

export function getSessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  
  if (!sessionCookie) return null;
  
  return sessionCookie.split('=')[1];
}

export function verifyPassword(inputPassword: string, correctPassword: string): boolean {
  return inputPassword === correctPassword;
}

