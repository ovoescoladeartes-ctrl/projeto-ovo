import "server-only";

import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

function readPrivateKey(): string {
	const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
	// No .env, quebras de linha da chave privada vêm escapadas como "\n".
	return rawKey.replace(/\\n/g, "\n");
}

function getOrCreateFirebaseAdminApp(): App {
	const existingApp = getApps()[0];
	if (existingApp) {
		return existingApp;
	}

	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
	const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
	const privateKey = readPrivateKey();

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error(
			"Firebase Admin não configurado. Preencha FIREBASE_ADMIN_PROJECT_ID, " +
				"FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no .env " +
				"(Firebase Console > Configurações do projeto > Contas de serviço).",
		);
	}

	return initializeApp({
		credential: cert({ projectId, clientEmail, privateKey }),
	});
}

export function getFirebaseAdminAuth(): Auth {
	return getAuth(getOrCreateFirebaseAdminApp());
}

export function getFirebaseAdminFirestore(): Firestore {
	return getFirestore(getOrCreateFirebaseAdminApp());
}
