/**
 * Verifies Slack request signature
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(
  request: Request,
  signingSecret: string
): Promise<boolean> {
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  const signature = request.headers.get('X-Slack-Signature');

  if (!timestamp || !signature) {
    return false;
  }

  // Check if timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  // Get request body
  const body = await request.clone().text();

  // Create signature base string
  const sigBaseString = `v0:${timestamp}:${body}`;

  // Create HMAC SHA256 hash
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(sigBaseString)
  );

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const computedSignature = `v0=${hashHex}`;

  // Compare signatures
  return computedSignature === signature;
}

