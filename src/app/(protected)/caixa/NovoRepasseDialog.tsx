"use client";

import { useState, useTransition } from "react";

import { DatePicker } from "@/components/DatePicker";
import { PessoaCombobox } from "@/components/PessoaCombobox";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESTINO_TIPOS, type DestinoTipo } from "@/core/financeiro/repasses/schema";
import { parseCentavosInput } from "@/lib/currency";

import { criarRepasse } from "./actions";

const NENHUMA_TURMA = "__nenhuma__";

const DESTINO_LABELS: Record<DestinoTipo, string> = {
	educador: "Educador",
	espaco: "Espaço",
	outro: "Outro",
};

interface TurmaOpcao {
	id: string;
	nome: string;
}

interface NovoRepasseDialogProps {
	turmas: TurmaOpcao[];
}

function hoje(): string {
	return new Date().toISOString().slice(0, 10);
}

export function NovoRepasseDialog({ turmas }: NovoRepasseDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("educador");
	const [destinoPessoaId, setDestinoPessoaId] = useState<string | null>(null);
	const [turmaId, setTurmaId] = useState<string>("");
	const [valor, setValor] = useState("");
	const [vencimento, setVencimento] = useState(hoje());
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function limpar(): void {
		setDestinoTipo("educador");
		setDestinoPessoaId(null);
		setTurmaId("");
		setValor("");
		setVencimento(hoje());
	}

	function handleSalvar(): void {
		setErro(null);

		if (destinoTipo === "educador" && destinoPessoaId === null) {
			setErro("Selecione o educador de destino.");
			return;
		}

		const valorCentavos = parseCentavosInput(valor);
		if (valorCentavos === null || valorCentavos <= 0) {
			setErro("Valor inválido.");
			return;
		}

		startTransition(async () => {
			const result = await criarRepasse({
				destinoTipo,
				destinoPessoaId: destinoTipo === "educador" ? destinoPessoaId : null,
				turmaId: turmaId === "" ? null : turmaId,
				valorCentavos,
				vencimento,
				origem: "manual",
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			limpar();
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button">Novo repasse</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo repasse</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="repasse-destino-tipo">Destino</Label>
						<Select
							value={destinoTipo}
							onValueChange={(value) => {
								setDestinoTipo(value as DestinoTipo);
								setDestinoPessoaId(null);
							}}
							disabled={isPending}
						>
							<SelectTrigger id="repasse-destino-tipo">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DESTINO_TIPOS.map((opcao) => (
									<SelectItem key={opcao} value={opcao}>
										{DESTINO_LABELS[opcao]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{destinoTipo === "educador" ? (
						<div className="space-y-1.5">
							<Label>Educador</Label>
							<PessoaCombobox
								value={destinoPessoaId}
								onChange={(pessoa) => setDestinoPessoaId(pessoa?.id ?? null)}
								papel="professor"
								disabled={isPending}
							/>
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="repasse-turma">Turma / papel (opcional)</Label>
						<Select
							value={turmaId === "" ? NENHUMA_TURMA : turmaId}
							onValueChange={(value) => setTurmaId(value === NENHUMA_TURMA ? "" : value)}
							disabled={isPending}
						>
							<SelectTrigger id="repasse-turma">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NENHUMA_TURMA}>Nenhuma</SelectItem>
								{turmas.map((turma) => (
									<SelectItem key={turma.id} value={turma.id}>
										{turma.nome}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="repasse-valor">Valor (R$)</Label>
						<Input
							id="repasse-valor"
							inputMode="decimal"
							placeholder="45,00"
							value={valor}
							onChange={(event) => setValor(event.target.value)}
							disabled={isPending}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="repasse-vencimento">Vencimento</Label>
						<DatePicker id="repasse-vencimento" value={vencimento} onChange={setVencimento} disabled={isPending} />
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleSalvar} disabled={isPending}>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
