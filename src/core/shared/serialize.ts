import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

/**
 * Converte `Timestamp` do Admin SDK para ISO string antes de passar de Server
 * Component para Client Component (Timestamp não é serializável entre os dois).
 */
export function toIso(timestamp: Timestamp | null | undefined): string | null {
	return timestamp ? timestamp.toDate().toISOString() : null;
}
