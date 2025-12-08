/**
 * Masks an email address for privacy in admin views.
 * Example: john.doe@example.com → j***@example.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) {
    return email || 'No email';
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 1) {
    return `*@${domain}`;
  }

  // Show first character, mask the rest
  const maskedLocal = localPart[0] + '***';
  
  return `${maskedLocal}@${domain}`;
};
