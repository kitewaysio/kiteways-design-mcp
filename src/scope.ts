/**
 * What the person limited this connection to. A limit that was asked for and cannot be read
 * must never become no limit: `--scope` with nothing after it, or with a word that is not a
 * scope, used to send no header at all, and no header means every file the person can reach.
 * Now the program refuses to start and says how the limit is written.
 *
 * The same rule as the app's own bridge (`packages/mcp/src/agent/bridge-arguments.ts` in the
 * Kiteways Design repository); a test there holds the two to the same answers.
 */

export const SCOPE_FLAG = '--scope';
export const SCOPE_VARIABLE = 'KITEWAYS_DESIGN_MCP_SCOPE';

/** `file:<id>`, `project:<id>` or `team:<id>`, as the app reads it. */
const SCOPE = /^(file|project|team):[A-Za-z0-9_-]{1,400}$/;

/**
 * The scope to connect with, or undefined when the person set no limit at all. Throws when a
 * limit was given that is not one.
 */
export function scopeArgumentOf(
  argumentList: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const flagAt = argumentList.indexOf(SCOPE_FLAG);
  const given = flagAt === -1 ? environment[SCOPE_VARIABLE] : (argumentList[flagAt + 1] ?? '');
  if (given === undefined) return undefined;
  const scope = given.trim();
  if (!SCOPE.test(scope)) {
    const from = flagAt === -1 ? SCOPE_VARIABLE : SCOPE_FLAG;
    throw new Error(
      `${from} must be file:<id>, project:<id> or team:<id>. The connection was not started: a limit that cannot be read is never taken as no limit.`,
    );
  }
  return scope;
}

export const CONNECTION_TOKEN_VARIABLE = 'KITEWAYS_DESIGN_MCP_TOKEN';

/** A connection's token as the app makes one: a plain random word. */
const CONNECTION_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

/**
 * The token of a connection the person made in the app (Agent settings, Connections), limited
 * there to a file, a project or a team. It is what this program presents instead of the token
 * in the discovery file, which reaches everything. Undefined when none is set. A token that is
 * set and is not one stops the program: it must never fall back to the token for everything.
 */
export function connectionTokenOf(
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const given = environment[CONNECTION_TOKEN_VARIABLE];
  if (given === undefined) return undefined;
  const token = given.trim();
  if (!CONNECTION_TOKEN.test(token)) {
    throw new Error(
      `${CONNECTION_TOKEN_VARIABLE} is not a connection token. Copy it again from Agent settings in the app. The connection was not started: it is never started with wider access instead.`,
    );
  }
  return token;
}
