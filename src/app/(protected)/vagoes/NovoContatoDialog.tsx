"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { InteresseTagsInput } from "@/components/InteresseTagsInput";
import { PessoaCombobox } from "@/components/PessoaCombobox";
import { CANAIS, type Canal } from "@/core/comunicacao/contatos/schema";

import { criarContato } from "./actions";

const CANAL_LABELS: Record<Canal, string> = {
	whatsapp: "WhatsApp",
	instagram: "Instagram",
	indicacao: "Indicação",
	site: "Site",
	outro: "Outro",
};

const ESTADO_INICIAL = { nome: "", canal: "whatsapp" as Canal, interesseInicial: "" };

interface NovoContatoDialogProps {
	opcoesInteresse: string[];
	/** `true` quando a página veio com `?novo=1` (atalho "Cadastrar novos contatos" do Checklist do Dia) — abre o formulário direto. */
	abertoInicial?: boolean;
	/**
	 * `false` = sem o botão "Novo contato" (instância só pra abertura via `?novo=1`). Nunca passar
	 * `abertoInicial` pra instância do CTA do `PageHeader`: o CTA é renderizado duas vezes (desktop
	 * + header mobile via `PageBreadcrumb`/`SidebarShell`, este só escondido por CSS), e o conteúdo
	 * do Dialog vai pra um portal no `<body>` — as duas abririam juntas, com dois overlays e dois
	 * travamentos de scroll empilhados.
	 */
	mostrarGatilho?: boolean;
}

export function NovoContatoDialog({ opcoesInteresse, abertoInicial = false, mostrarGatilho = true }: NovoContatoDialogProps): React.ReactElement {
	const [open, setOpenState] = useState(abertoInicial);
	const router = useRouter();
	const pathname = usePathname();

	// Ao fechar, tira o `?novo=1` da URL (mantendo os demais filtros) — senão um refresh reabriria o formulário.
	function setOpen(proximo: boolean): void {
		setOpenState(proximo);
		if (proximo || typeof window === "undefined") {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		if (!params.has("novo")) {
			return;
		}
		params.delete("novo");
		const query = params.toString();
		router.replace(query.length > 0 ? `${pathname}?${query}` : pathname);
	}
	const [form, setForm] = useState(ESTADO_INICIAL);
	const [interesses, setInteresses] = useState<string[]>([]);
	const [pessoaId, setPessoaId] = useState<string | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleSalvar(): void {
		setErro(null);
		startTransition(async () => {
			const result = await criarContato({ ...form, interesses, pessoaId });
			if (result.status === "error") {
				setErro(result.message ?? "Não foi possível salvar.");
				return;
			}
			setOpen(false);
			setForm(ESTADO_INICIAL);
			setInteresses([]);
			setPessoaId(null);
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{mostrarGatilho ? (
				<DialogTrigger asChild>
					<Button type="button">Novo contato</Button>
				</DialogTrigger>
			) : null}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo contato</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label>Pessoa já cadastrada (opcional)</Label>
						<PessoaCombobox
							value={pessoaId}
							onChange={(pessoa) => {
								setPessoaId(pessoa?.id ?? null);
								if (pessoa !== null) {
									setForm((f) => ({ ...f, nome: pessoa.nome }));
								}
							}}
							papel="aluno"
							placeholder="Buscar pessoa existente..."
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="contato-nome">Nome</Label>
						<Input
							id="contato-nome"
							value={form.nome}
							onChange={(event) => setForm({ ...form, nome: event.target.value })}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="contato-canal">Canal</Label>
						<Select value={form.canal} onValueChange={(value) => setForm({ ...form, canal: value as Canal })} disabled={isPending}>
							<SelectTrigger id="contato-canal">
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
						<Label htmlFor="contato-interesse">O que a pessoa perguntou</Label>
						<Textarea
							id="contato-interesse"
							value={form.interesseInicial}
							onChange={(event) => setForm({ ...form, interesseInicial: event.target.value })}
							disabled={isPending}
							rows={3}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>Interesses</Label>
						<InteresseTagsInput value={interesses} onChange={setInteresses} opcoes={opcoesInteresse} disabled={isPending} />
					</div>

					{erro !== null ? <p className="text-xs text-destructive">{erro}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSalvar}
						disabled={isPending || form.nome.trim() === "" || form.interesseInicial.trim() === ""}
					>
						{isPending ? "Salvando..." : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
