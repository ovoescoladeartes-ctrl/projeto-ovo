"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";

interface FirebaseClientConfig {
	apiKey: string;
	authDomain: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;
	appId: string;
}

function readFirebaseClientConfig(): FirebaseClientConfig {
	const config: FirebaseClientConfig = {
		apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
		authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
		projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
		storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
		messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
		appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
	};

	const missing = Object.entries(config).filter(([, value]) => value === "");
	if (missing.length > 0) {
		// Não lança erro em build/SSR — só avisa em runtime de browser, onde o login de fato acontece.
		if (typeof window !== "undefined") {
			// eslint-disable-next-line no-console
			console.warn(
				`Firebase client config incompleta. Preencha .env.local com: ${missing
					.map(([key]) => key)
					.join(", ")}`,
			);
		}
	}

	return config;
}

function getOrCreateFirebaseApp(): FirebaseApp {
	const existingApp = getApps()[0];
	if (existingApp) {
		return existingApp;
	}
	return initializeApp(readFirebaseClientConfig());
}

export const firebaseApp: FirebaseApp = getOrCreateFirebaseApp();
export const auth: Auth = getAuth(firebaseApp);
