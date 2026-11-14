import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Makes sure what listens on the port of the discovery file is the app that wrote it, before
 * anything of the app's is sent there. A file left by an app that crashed still names a port,
 * and anything on this computer may have taken it since.
 *
 * The order matters. The token in the file opens every design the person can reach, so it is
 * not sent until the listener has shown it already has it:
 *
 *  1. the process that wrote the file must still be running;
 *  2. the listener is sent a fresh random challenge and NOTHING else: no token;
 *  3. it must answer with the challenge signed under a key made from the token. Only the app
 *     can make that, and the answer gives the token to nobody who lacks it;
 *  4. only then is the token sent, with the first request of the chat.
 *
 * The same rule as the app's own bridge (`requireTheApp` in `packages/mcp/src/agent/app-bridge.ts`
 * of the Kiteways Design repository; the app's side is `healthProofOf` in its loopback door). A
 * test there holds the two to the same answers.
 */

export interface AppDiscoveryFile {
  port: number;
  token: string;
  /** The process that wrote the file. A file whose process is gone points at nothing. */
  pid?: number | undefined;
}

const HEALTH_PATH = '/health';
const CHALLENGE_HEADER = 'x-kiteways-challenge';
/** What the key is made for, and what it signs: the proof can be used for nothing else. */
const PROOF_KEY_PURPOSE = 'kiteways-health-proof-key';
const PROOF_PURPOSE = 'kiteways-design-health-proof:v1:';

/** How the listener is asked: tests pass their own. */
export type HealthFetcher = (
  address: string,
  options: { headers: Record<string, string> },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Whether a process with this id exists. One we may not signal still exists. */
export function isProcessAlive(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch (failure) {
    return (failure as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** The challenge signed as only the holder of the token can sign it. */
export function expectedProofOf(token: string, challenge: string): string {
  const key = createHmac('sha256', token).update(PROOF_KEY_PURPOSE, 'utf8').digest();
  return createHmac('sha256', key).update(`${PROOF_PURPOSE}${challenge}`, 'utf8').digest('hex');
}

/** The same time whether two answers differ at the first letter or the last. */
function sameText(presented: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  return timingSafeEqual(digest(presented), digest(expected));
}

/** Throws unless the listener is the app that wrote the discovery file. Sends no token. */
export async function requireTheApp(
  discovery: AppDiscoveryFile,
  fetchHealth: HealthFetcher = (address, options) => fetch(address, options),
  processAlive: (processId: number) => boolean = isProcessAlive,
): Promise<void> {
  if (discovery.pid !== undefined && !processAlive(discovery.pid)) {
    throw new Error('the app that wrote the discovery file is no longer running');
  }
  const challenge = randomBytes(32).toString('base64url');
  // the challenge alone: whoever answers has been told nothing it could use
  const response = await fetchHealth(`http://127.0.0.1:${discovery.port}${HEALTH_PATH}`, {
    headers: { [CHALLENGE_HEADER]: challenge },
  });
  const answer = response.ok
    ? ((await response.json().catch(() => null)) as { proof?: unknown } | null)
    : null;
  const proof = typeof answer?.proof === 'string' ? answer.proof : '';
  if (!sameText(proof, expectedProofOf(discovery.token, challenge))) {
    throw new Error('what listens on the port of the discovery file is not the app');
  }
}
