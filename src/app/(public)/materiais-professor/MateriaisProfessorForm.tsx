"use client";

import { useState, useTransition } from "react";

import { criarItemMaterialPublico } from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MateriaisProfessorFormProps {
	turmasAtivas: { id: string; nome: string }[];
}

/** Sentinela do Select — Radix não aceita `value=""` (mesmo padrão de `AdicionarMaterialDialog`). */
const GERAL = "__geral__";

/**
 * Formulário público de `/materiais-professor` — mesmos campos/fluxo de `AdicionarMaterialDialog`
 * (turma-ou-Geral + texto livre), mas chama a action pública (`criarItemMaterialPublico`, sem
 * sessão) e mostra confirmação na própria tela em vez de fechar um dialog/navegar pra área logada.
 */
export function MateriaisProfessorForm({ turmasAtivas }: MateriaisProfessorFormProps): React.ReactElement {
	const [titulo, setTitulo] = useState("");
	const [turmaId, setTurmaId] = useState(GERAL);
	const [erro, setErro] = useState<string | null>(null);
	const [enviado, setEnviado] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleEnviar(): void {
		setErro(null);
		startTransition(async () => {
			const resultado = await criarItemMaterialPublico({
				titulo,
				turmaId: turmaId === GERAL ? null : turmaId,
			});
			if (resultado.status === "error") {
				setErro(resultado.message ?? "Não foi possível enviar.");
				return;
			}
			setEnviado(true);
		});
	}

	function handleEnviarOutro(): void {
		setEnviado(false);
		setTitulo("");
		setTurmaId(GERAL);
	}

	if (enviado) {
		return (
			<div className="flex flex-col items-start gap-4">
				<p className="text-sm text-foreground">Recebemos seu aviso. Obrigado!</p>
				<Button type="button" variant="outline" size="sm" onClick={handleEnviarOutro}>
					Reportar outro material
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-1.5">
				<Label htmlFor="material-turma">Turma</Label>
				<Select value={turmaId} onValueChange={setTurmaId} disabled={isPending}>
					<SelectTrigger id="material-turma">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={GERAL}>Geral</SelectItem>
						{turmasAtivas.map((turma) => (
							<SelectItem key={turma.id} value={turma.id}>
								{turma.nome}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="material-titulo">Material em falta</Label>
				<Input
					id="material-titulo"
					value={titulo}
					onChange={(event) => setTitulo(event.target.value)}
					maxLength={200}
					disabled={isPending}
					placeholder="Ex.: tinta guache azul"
				/>
			</div>

			{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}

			<Button type="button" onClick={handleEnviar} disabled={isPending || titulo.trim().length === 0}>
				{isPending ? "Enviando..." : "Enviar"}
			</Button>
		</div>
	);
}
