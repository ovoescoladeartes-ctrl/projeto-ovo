/**
 * Uso: npx tsx scripts/set-role.ts <uid> <role>
 * roles válidas: admin | financeiro | comunicacao | educador
 *
 * Por design, o cadastro nunca atribui role sozinho (constitution.md §5) — a conta
 * fica com `role: "pendente"` até um admin liberar. Este script é o bootstrap do
 * primeiro admin (quando ainda ninguém tem acesso à UI); no dia a dia, use
 * `/admin/usuarios` em vez deste script.
 * Requer as mesmas variáveis de ambiente do Admin SDK (.env: FIREBASE_ADMIN_*).
 */
import "dotenv/config";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { ROLES, isRole } from "../src/core/auth/Role";

async function main(): Promise<void> {
	const [uid, role] = process.argv.slice(2);

	if (uid === undefined || role === undefined || !isRole(role)) {
		console.error(`Uso: npx tsx scripts/set-role.ts <uid> <role>\nroles válidas: ${ROLES.join(", ")}`);
		process.exitCode = 1;
		return;
	}

	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

	if (!projectId || !clientEmail || !privateKey) {
		console.error("FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY precisam estar no .env.");
		process.exitCode = 1;
		return;
	}

	if (getApps().length === 0) {
		initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
	}

	await getAuth().setCustomUserClaims(uid, { role });
	await getFirestore().collection("users").doc(uid).set(
		{ role, atualizadoEm: new Date() },
		{ merge: true },
	);

	console.log(`Role "${role}" atribuída ao usuário ${uid}.`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
