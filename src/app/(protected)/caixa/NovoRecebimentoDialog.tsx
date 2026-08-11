"use client";

import { useState, useTransition } from "react";

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
import { FORMAS_PAGAMENTO, RECEBIMENTO_STATUS, type FormaPagamento, type RecebimentoStatus } from "@/core/financeiro/recebimentos/schema";
import { parseCentavosInput } from "@/lib/currency";

import { criarRecebimento } from "./actions";

const NENHUMA_TURMA = "__nenhuma__";

const FORMA_LABELS: Record<FormaPagamento, string> = {
	pix: "Pix",
	dinheiro: "Dinheiro",
	cartao: "Cartão",
	transferencia: "Transferência",
	boleto: "Boleto",
	outro: "Outro",
};

const STATUS_LABELS: Record<RecebimentoStatus, string> = {
	confirmado: "Confirmado",
	pendente: "Pendente",
	cancelado: "Cancelado",
};

interface TurmaOpcao {
	id: string;
	nome: string;
}

interface NovoRecebimentoDialogProps {
	turmas: TurmaOpcao[];
}

function hoje(): string {
	return new Date().toISOString().slice(0, 10);
}

export function NovoRecebimentoDialog({ turmas }: NovoRecebimentoDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [pessoaId, setPessoaId] = useState<string | null>(null);
	const [turmaId, setTurmaId] = useState<string>("");
	const [valor, setValor] = useState("");
	const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
	const [status, setStatus] = useState<RecebimentoStatus>("confirmado");
	const [dataRecebimento, setDataRecebimento] = useState(hoje());
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function limpar(): void {
		setPessoaId(null);
		setTurmaId("");
		setValor("");
		setFormaPagamento("pix");
		setStatus("confirmado");
		setDataRecebimento(hoje());
	}

	function handleSalvar(): void {
		setErro(null);

		if (pessoaId === null) {
			setErro("Selecione uma pessoa.");
			return;
		}

		const valorCentavos = parseCentavosInput(valor);
		if (valorCentavos === null || valorCentavos <= 0) {
			setErro("Valor inválido.");
			return;
		}

		startTransition(async () => {
			const result = await criarRecebimento({
				pessoaId,
				turmaId: turmaId === "" ? null : turmaId,
				matriculaId: null,
				valorCentavos,
				formaPagamento,
				origem: "manual",
				status,
				dataRecebimento,
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
				<Button type="button">Novo recebimento</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo recebimento</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label>Pessoa</Label>
						<PessoaCombobox value={pessoaId} onChange={(pessoa) => setPessoaId(pessoa?.id ?? null)} disabled={isPending} />
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="recebimento-turma">Turma (opcional)</Label>
						<Select
							value={turmaId === "" ? NENHUMA_TURMA : turmaId}
							onValueChange={(value) => setTurmaId(value === NENHUMA_TURMA ? "" : value)}
							disabled={isPending}
						>
							<SelectTrigger id="recebimento-turma">
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

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="recebimento-valor">Valor (R$)</Label>
							<Input
								id="recebimento-valor"
								inputMode="decimal"
								placeholder="150,00"
								value={valor}
								onChange={(event) => setValor(event.target.value)}
								disabled={isPending}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="recebimento-data">Data</Label>
							<Input
								id="recebimento-data"
								type="date"
								value={dataRecebimento}
								onChange={(event) => setDataRecebimento(event.target.value)}
								disabled={isPending}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="recebimento-forma">Forma de pagamento</Label>
							<Select value={formaPagamento} onValueChange={(value) => setFormaPagamento(value as FormaPagamento)} disabled={isPending}>
								<SelectTrigger id="recebimento-forma">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FORMAS_PAGAMENTO.map((forma) => (
										<SelectItem key={forma} value={forma}>
											{FORMA_LABELS[forma]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="recebimento-status">Status</Label>
							<Select value={status} onValueChange={(value) => setStatus(value as RecebimentoStatus)} disabled={isPending}>
								<SelectTrigger id="recebimento-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RECEBIMENTO_STATUS.map((opcao) => (
										<SelectItem key={opcao} value={opcao}>
											{STATUS_LABELS[opcao]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
