"use client";

import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ARQUIVADO_MOTIVOS, CANAIS, type ArquivadoMotivo, type Canal, type Contato } from "@/core/comunicacao/contatos/schema";

import { editarContato, moverEstagioContato, registrarInteracaoContato } from "./actions";

const CANAL_LABELS: Record<Canal, string> = {
	whatsapp: "WhatsApp",
	instagram: "Instagram",
	indicacao: "Indicação",
	site: "Site",
	outro: "Outro",
};

const ARQUIVADO_MOTIVO_LABELS: Record<ArquivadoMotivo, string> = {
	ex_aluno: "Ex-aluno",
	nao_convertido: "Não convertido",
};

interface FormState {
	nome: string;
	canal: Canal;
}

function formInicial(contato: Contato): FormState {
	return { nome: contato.nome, canal: contato.canal };
}

function formatarData(iso: string): string {
	return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface ContatoDetalheSheetProps {
	contato: Contato | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	opcoesInteresse: string[];
	onAbrirBiblioteca: () => void;
}

/** Card expandido de Vagões: edição dos campos, histórico de interações e encerrar/arquivar
 * (nunca apaga o registro — reaproveita `moverEstagioContato`, mesma garantia do drag). O
 * nome só vira link pra `/pessoas/[id]` quando já existe Pessoa vinculada. */
export function ContatoDetalheSheet({ contato, open, onOpenChange, opcoesInteresse, onAbrirBiblioteca }: ContatoDetalheSheetProps): React.ReactElement | null {
	const [form, setForm] = useState<FormState | null>(contato !== null ? formInicial(contato) : null);
	const [interesses, setInteresses] = useState<string[]>(contato?.interesses ?? []);
	const [novaInteracao, setNovaInteracao] = useState("");
	const [motivoEncerrar, setMotivoEncerrar] = useState<ArquivadoMotivo>("nao_convertido");
	const [encerrarAberto, setEncerrarAberto] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [isPendingSalvar, startTransitionSalvar] = useTransition();
	const [isPendingInteracao, startTransitionInteracao] = useTransition();
	const [isPendingEncerrar, startTransitionEncerrar] = useTransition();

	useEffect(() => {
		if (contato !== null) {
			setForm(formInicial(contato));
			setInteresses(contato.interesses);
			setErro(null);
		}
	}, [contato]);

	if (contato === null || form === null) {
		return null;
	}

	function handleSalvar(): void {
		if (contato === null || form === null) {
			return;
		}
		setErro(null);
		startTransitionSalvar(async () => {
			// interesseInicial/linkReferencia/observacoes não são editáveis aqui — enviados de
			// volta sem alteração pra não sobrescrever com null o que já estava salvo.
			const result = await editarContato({
				id: contato.id,
				nome: form.nome,
				canal: form.canal,
				interesseInicial: contato.interesseInicial,
				interesses,
				linkReferencia: contato.linkReferencia,
				observacoes: contato.observacoes,
			});
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
			}
		});
	}

	function handleAdicionarInteracao(): void {
		if (contato === null || novaInteracao.trim() === "") {
			return;
		}
		startTransitionInteracao(async () => {
			const result = await registrarInteracaoContato({ id: contato.id, texto: novaInteracao.trim() });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setNovaInteracao("");
		});
	}

	function handleEncerrar(): void {
		if (contato === null) {
			return;
		}
		startTransitionEncerrar(async () => {
			await moverEstagioContato({ id: contato.id, estagio: "arquivado", arquivadoMotivo: motivoEncerrar });
			setEncerrarAberto(false);
			onOpenChange(false);
		});
	}

	function handleAbrirBiblioteca(): void {
		onOpenChange(false);
		onAbrirBiblioteca();
	}

	const historicoOrdenado = [...contato.historico].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						{contato.pessoaId !== null ? (
							<Link href={`/pessoas/${contato.pessoaId}`} className="underline-offset-4 hover:underline">
								{contato.nome}
							</Link>
						) : (
							contato.nome
						)}
					</SheetTitle>
				</SheetHeader>

				<div className="mt-4 space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="detalhe-nome">Nome</Label>
						<Input id="detalhe-nome" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} disabled={isPendingSalvar} />
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="detalhe-canal">Canal de origem</Label>
						<Select value={form.canal} onValueChange={(value) => setForm({ ...form, canal: value as Canal })} disabled={isPendingSalvar}>
							<SelectTrigger id="detalhe-canal">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CANAIS.map((canal) => (
									<SelectItem key={canal} value={canal}>
										{CANAL_LABELS[canal]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Turmas de interesse</Label>
						<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPendingSalvar} />
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}

					<Button type="button" onClick={handleSalvar} disabled={isPendingSalvar || form.nome.trim() === ""}>
						{isPendingSalvar ? "Salvando..." : "Salvar alterações"}
					</Button>

					<Separator />

					<div className="space-y-2">
						<Label>Histórico de interações</Label>
						<div className="flex gap-2">
							<Input
								value={novaInteracao}
								onChange={(event) => setNovaInteracao(event.target.value)}
								placeholder="Registrar uma interação..."
								disabled={isPendingInteracao}
							/>
							<Button type="button" variant="outline" onClick={handleAdicionarInteracao} disabled={isPendingInteracao || novaInteracao.trim() === ""}>
								Adicionar
							</Button>
						</div>
						<div className="space-y-2">
							{historicoOrdenado.map((item, index) => (
								<div key={index} className="rounded-md border border-border p-2.5">
									<p className="text-sm text-foreground">{item.texto}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{formatarData(item.criadoEm)} · {item.autorNome}
									</p>
								</div>
							))}
							{historicoOrdenado.length === 0 ? <p className="py-2 text-center text-xs text-muted-foreground">Nenhuma interação registrada ainda.</p> : null}
						</div>
					</div>

					<Button type="button" variant="link" className="h-auto justify-start gap-1.5 px-0 text-sm" onClick={handleAbrirBiblioteca}>
						<MessageSquareText className="h-4 w-4" />
						Usar mensagem pronta
					</Button>

					<Separator />

					<AlertDialog open={encerrarAberto} onOpenChange={setEncerrarAberto}>
						<AlertDialogTrigger asChild>
							<Button type="button" variant="outline" className="text-danger hover:text-danger">
								Encerrar / arquivar
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Encerrar {contato.nome}?</AlertDialogTitle>
								<AlertDialogDescription>
									O contato sai do funil ativo e vai para uma das colunas de arquivados — o registro nunca é apagado, dá pra reabrir movendo de volta.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="space-y-1.5">
								<Label htmlFor="detalhe-motivo">Motivo</Label>
								<Select value={motivoEncerrar} onValueChange={(value) => setMotivoEncerrar(value as ArquivadoMotivo)}>
									<SelectTrigger id="detalhe-motivo">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ARQUIVADO_MOTIVOS.map((motivo) => (
											<SelectItem key={motivo} value={motivo}>
												{ARQUIVADO_MOTIVO_LABELS[motivo]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isPendingEncerrar}>Cancelar</AlertDialogCancel>
								<Button type="button" variant="destructive" onClick={handleEncerrar} disabled={isPendingEncerrar}>
									{isPendingEncerrar ? "Encerrando..." : "Encerrar"}
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</SheetContent>
		</Sheet>
	);
}
