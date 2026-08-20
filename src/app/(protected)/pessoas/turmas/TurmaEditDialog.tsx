"use client";

import { MoreVertical, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { DatePicker } from "@/components/DatePicker";
import { PessoaCombobox } from "@/components/PessoaCombobox";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PessoaBusca } from "@/core/pessoas/actions";
import type { RepasseTipo, Turma, TurmaTipo } from "@/core/turmas/schema";
import { parseCentavosInput } from "@/lib/currency";

import { atualizarTurma } from "./actions";
import { TurmaArquivarMenuItem } from "./TurmaArquivarMenuItem";

const TIPO_SEM_CLASSIFICACAO = "nenhum";

function centavosParaInput(centavos: number): string {
	return (centavos / 100).toFixed(2).replace(".", ",");
}

function dataIsoParaInput(iso: string | null): string {
	return iso ? iso.slice(0, 10) : "";
}

interface TurmaEditDialogProps {
	turma: Turma;
	educadorInicial: PessoaBusca | null;
	matriculasAtivasCount: number;
}

export function TurmaEditDialog({ turma, educadorInicial, matriculasAtivasCount }: TurmaEditDialogProps): React.ReactElement {
	const [open, setOpen] = useState(false);
	const [nome, setNome] = useState(turma.nome);
	const [assunto, setAssunto] = useState(turma.assunto);
	const [tipo, setTipo] = useState(turma.tipo ?? TIPO_SEM_CLASSIFICACAO);
	const [mensalidade, setMensalidade] = useState(centavosParaInput(turma.mensalidadeCentavos));
	const [repasseTipo, setRepasseTipo] = useState<RepasseTipo>(turma.repasseTipo);
	const [repasseValor, setRepasseValor] = useState(
		turma.repasseTipo === "fixo" ? centavosParaInput(turma.repasseValor) : String(turma.repasseValor).replace(".", ","),
	);
	const [dataInicio, setDataInicio] = useState(dataIsoParaInput(turma.dataInicio));
	const [dataFim, setDataFim] = useState(dataIsoParaInput(turma.dataFim));
	const [educadorPessoaId, setEducadorPessoaId] = useState<string | null>(turma.educadorPessoaId);
	const [capacidadeMaxima, setCapacidadeMaxima] = useState(
		turma.capacidadeMaxima !== null ? String(turma.capacidadeMaxima) : "",
	);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);

		const mensalidadeCentavos = parseCentavosInput(mensalidade);
		if (mensalidadeCentavos === null) {
			setErro("Mensalidade inválida.");
			return;
		}

		let repasseValorFinal: number | null;
		if (repasseTipo === "percentual") {
			const numero = Number(repasseValor.replace(",", "."));
			repasseValorFinal = Number.isFinite(numero) ? numero : null;
		} else {
			repasseValorFinal = parseCentavosInput(repasseValor);
		}
		if (repasseValorFinal === null) {
			setErro("Valor de repasse inválido.");
			return;
		}

		const capacidadeMaximaFinal = capacidadeMaxima.trim() === "" ? null : Number(capacidadeMaxima);
		if (capacidadeMaximaFinal !== null && (!Number.isInteger(capacidadeMaximaFinal) || capacidadeMaximaFinal <= 0)) {
			setErro("Capacidade máxima inválida.");
			return;
		}

		startTransition(async () => {
			const result = await atualizarTurma({
				id: turma.id,
				nome,
				assunto,
				tipo: tipo === TIPO_SEM_CLASSIFICACAO ? null : (tipo as TurmaTipo),
				mensalidadeCentavos,
				repasseTipo,
				repasseValor: repasseValorFinal,
				dataInicio,
				dataFim: dataFim === "" ? null : dataFim,
				educadorPessoaId,
				capacidadeMaxima: capacidadeMaximaFinal,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					<Pencil className="h-4 w-4" />
					Editar
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Editar turma</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor={`turma-nome-${turma.id}`}>Nome</Label>
						<Input
							id={`turma-nome-${turma.id}`}
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-assunto-${turma.id}`}>Assunto</Label>
						<Input
							id={`turma-assunto-${turma.id}`}
							value={assunto}
							onChange={(event) => setAssunto(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-tipo-${turma.id}`}>Tipo (opcional)</Label>
						<Select value={tipo} onValueChange={setTipo} disabled={isPending}>
							<SelectTrigger id={`turma-tipo-${turma.id}`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={TIPO_SEM_CLASSIFICACAO}>Não classificado</SelectItem>
								<SelectItem value="curso">Curso</SelectItem>
								<SelectItem value="oficina">Oficina</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-mensalidade-${turma.id}`}>Mensalidade (R$)</Label>
						<Input
							id={`turma-mensalidade-${turma.id}`}
							inputMode="decimal"
							value={mensalidade}
							onChange={(event) => setMensalidade(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-repasse-tipo-${turma.id}`}>Tipo de repasse</Label>
						<Select
							value={repasseTipo}
							onValueChange={(value) => {
								setRepasseTipo(value as RepasseTipo);
								setRepasseValor("");
							}}
							disabled={isPending}
						>
							<SelectTrigger id={`turma-repasse-tipo-${turma.id}`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="percentual">Percentual</SelectItem>
								<SelectItem value="fixo">Fixo</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-repasse-valor-${turma.id}`}>
							{repasseTipo === "percentual" ? "Repasse (%)" : "Repasse (R$)"}
						</Label>
						<Input
							id={`turma-repasse-valor-${turma.id}`}
							inputMode="decimal"
							value={repasseValor}
							onChange={(event) => setRepasseValor(event.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-data-inicio-${turma.id}`}>Início</Label>
						<DatePicker
							id={`turma-data-inicio-${turma.id}`}
							value={dataInicio}
							onChange={setDataInicio}
							disabled={isPending}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={`turma-data-fim-${turma.id}`}>Fim (opcional)</Label>
						<DatePicker
							id={`turma-data-fim-${turma.id}`}
							value={dataFim}
							onChange={setDataFim}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>Educador (opcional)</Label>
						<PessoaCombobox
							value={educadorPessoaId}
							onChange={(pessoa: PessoaBusca | null) => setEducadorPessoaId(pessoa?.id ?? null)}
							papel="professor"
							valorInicial={educadorInicial}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={`turma-capacidade-${turma.id}`}>Capacidade máxima (opcional)</Label>
						<Input
							id={`turma-capacidade-${turma.id}`}
							inputMode="numeric"
							placeholder="Sem limite"
							value={capacidadeMaxima}
							onChange={(event) => setCapacidadeMaxima(event.target.value)}
							disabled={isPending}
						/>
						<p className="text-xs text-muted-foreground">
							{matriculasAtivasCount} matriculado{matriculasAtivasCount === 1 ? "" : "s"}
							{turma.capacidadeMaxima !== null ? ` / ${turma.capacidadeMaxima}` : ""} — só informativo, não bloqueia matrícula.
						</p>
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancelar
						</Button>
					</DialogClose>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || nome.trim() === "" || assunto.trim() === "" || dataInicio === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
					{turma.ativo ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									title="Mais ações"
									aria-label="Mais ações"
									className="ml-auto sm:ml-0"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<TurmaArquivarMenuItem id={turma.id} nome={turma.nome} onArquivado={() => setOpen(false)} />
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
