"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProtectedErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/**
 * Até 2026-09-21 não existia nenhum `error.tsx` no projeto — uma falha de leitura no servidor
 * (ex.: `RESOURCE_EXHAUSTED` de cota do Firestore) derrubava a página inteira com o boundary
 * genérico do Next ("Application error… Digest: …"), sem nada acionável pra quem via a tela.
 *
 * Em produção o Next redige a mensagem real do erro nesse boundary por segurança — só o
 * `digest` chega até aqui, então não dá pra detectar "é cota excedida" com certeza no client. O
 * erro completo já vai para os logs do servidor (console da Vercel) por padrão; o `digest` é o
 * que permite cruzar essa tela com aquele log.
 */
export default function ProtectedError({ error, reset }: ProtectedErrorProps): React.ReactElement {
	useEffect(() => {
		// eslint-disable-next-line no-console
		console.error("Erro numa página protegida:", error);
	}, [error]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-sm text-center">
				<CardHeader>
					<CardTitle>Não foi possível carregar</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Algo deu errado ao buscar os dados. Pode ser uma instabilidade passageira — tente de novo em alguns
						instantes.
					</p>
					<p className="mt-3 text-xs text-muted-foreground/70">
						Se continuar acontecendo, avise um admin{error.digest ? ` e informe este código: ${error.digest}` : "."}
					</p>
					<Button className="mt-4 w-full" onClick={() => reset()}>
						Tentar de novo
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
