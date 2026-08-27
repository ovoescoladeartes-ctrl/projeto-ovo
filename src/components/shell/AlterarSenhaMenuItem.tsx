"use client";

import { type FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { Lock } from "lucide-react";
import { useState } from "react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getFirebaseAuth } from "@/core/firebase/firebaseClient";

function mensagemDeErro(error: unknown): string {
	const code = (error as FirebaseError | undefined)?.code;
	switch (code) {
		case "auth/too-many-requests":
			return "Muitas tentativas. Aguarde um pouco.";
		default:
			return "Não foi possível enviar. Tente de novo.";
	}
}

interface AlterarSenhaMenuItemProps {
	email: string;
}

/** Item único do popover de conta hoje — estrutura (DropdownMenuItem simples) já comporta
 * mais itens depois (ex. "trocar de conta") sem redesenho. */
export function AlterarSenhaMenuItem({ email }: AlterarSenhaMenuItemProps): React.ReactElement {
	const [estado, setEstado] = useState<"idle" | "enviando" | "enviado" | "erro">("idle");
	const [erro, setErro] = useState<string | null>(null);

	async function handleClick(): Promise<void> {
		if (estado === "enviando") {
			return;
		}
		setEstado("enviando");
		setErro(null);
		try {
			await sendPasswordResetEmail(getFirebaseAuth(), email);
			setEstado("enviado");
		} catch (error) {
			setErro(mensagemDeErro(error));
			setEstado("erro");
		}
	}

	const rotulo = estado === "enviando" ? "Enviando..." : estado === "enviado" ? "E-mail enviado" : estado === "erro" ? (erro ?? "Erro") : "Alterar senha";

	return (
		// preventDefault mantém o menu aberto pra mostrar o resultado (mesmo truque de
		// PessoaArquivarMenuItem.tsx) — sem toast no projeto, o feedback é inline no item.
		<DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={handleClick} disabled={estado === "enviando"}>
			<Lock className="h-4 w-4" />
			{rotulo}
		</DropdownMenuItem>
	);
}
