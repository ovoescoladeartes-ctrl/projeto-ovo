"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { auth } from "@/core/firebase/firebaseClient";

/**
 * Custom claims só chegam num ID token novo — o cookie de sessão guarda o token
 * emitido no login, então liberar uma role no `/admin/usuarios` não reflete aqui
 * até o usuário forçar um refresh do token (ou relogar). Este botão faz esse
 * refresh e re-envia o token pro `/api/auth/session`, sem exigir logout/login.
 */
export function RefreshAccessButton(): React.ReactElement {
	const router = useRouter();
	const [carregando, setCarregando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);

	async function handleClick(): Promise<void> {
		setErro(null);
		setCarregando(true);

		try {
			const user = auth.currentUser;
			if (user === null) {
				router.push("/login");
				return;
			}

			const idToken = await user.getIdToken(true);
			const response = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			if (!response.ok) {
				setErro("Não foi possível verificar o acesso. Tente novamente.");
				return;
			}

			router.refresh();
		} catch {
			setErro("Não foi possível verificar o acesso. Tente novamente.");
		} finally {
			setCarregando(false);
		}
	}

	return (
		<div className="mt-4">
			<Button type="button" onClick={handleClick} disabled={carregando}>
				{carregando ? "Verificando..." : "Verificar acesso novamente"}
			</Button>
			{erro !== null ? <p className="mt-2 text-sm text-destructive">{erro}</p> : null}
		</div>
	);
}
