"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getFirebaseAuth } from "@/core/firebase/firebaseClient";

/** Compartilhado por todo trigger de "Sair" (menu principal desktop/mobile). */
export function useLogout(): { saindo: boolean; handleLogout: () => Promise<void> } {
	const router = useRouter();
	const [saindo, setSaindo] = useState(false);

	async function handleLogout(): Promise<void> {
		setSaindo(true);
		try {
			await getFirebaseAuth().signOut();
			await fetch("/api/auth/session", { method: "DELETE" });
		} finally {
			router.push("/login");
		}
	}

	return { saindo, handleLogout };
}
