import { SessionStatus } from '@p2p-share/shared-types';
/**
 * Session State Machine — defines valid state transitions.
 *
 * The session lifecycle is a directed graph:
 *
 *   WAITING ──→ JOINED ──→ CONNECTING ──→ CONNECTED ──→ TRANSFERRING ──→ COMPLETED
 *     │           │            │              │               │
 *     ├→ EXPIRED  ├→ CANCELLED ├→ FAILED      ├→ FAILED       ├→ FAILED
 *     └→ CANCELLED└→ EXPIRED   └→ CANCELLED   └→ CANCELLED    └→ CANCELLED
 *
 * Any transition not in this map is REJECTED.
 */
const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  [SessionStatus.WAITING]: [
    SessionStatus.JOINED,
    SessionStatus.EXPIRED,
    SessionStatus.CANCELLED,
  ],
  [SessionStatus.JOINED]: [
    SessionStatus.CONNECTING,
    SessionStatus.EXPIRED,
    SessionStatus.CANCELLED,
  ],
  [SessionStatus.CONNECTING]: [
    SessionStatus.CONNECTED,
    SessionStatus.FAILED,
    SessionStatus.CANCELLED,
  ],
  [SessionStatus.CONNECTED]: [
    SessionStatus.TRANSFERRING,
    SessionStatus.FAILED,
    SessionStatus.CANCELLED,
  ],
  [SessionStatus.TRANSFERRING]: [
    SessionStatus.COMPLETED,
    SessionStatus.FAILED,
    SessionStatus.CANCELLED,
  ],
  // Terminal states — no transitions out
  [SessionStatus.COMPLETED]: [],
  [SessionStatus.FAILED]: [],
  [SessionStatus.EXPIRED]: [],
  [SessionStatus.CANCELLED]: [],
};
/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  from: SessionStatus,
  to: SessionStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
/**
 * Get all valid next states from the current state.
 */
export function getValidNextStates(current: SessionStatus): SessionStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}
/**
 * Check if a status is a terminal (final) state.
 */
export function isTerminalState(status: SessionStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}
