"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PessoasFiltroBar(): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const tipo = searchParams.get("tipo") ?? "todos";
	const status = searchParams.get("status") ?? "todos";

	function atualizarFiltro(chave: "tipo" | "status", valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === "todos") {
			params.delete(chave);
		} else {
			params.set(chave, valor);
		}
		if (chave === "tipo") {
			params.delete("status");
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	const statusOpcoes =
		tipo === "aluno"
			? [
					{ value: "lead", label: "Lead" },
					{ value: "matriculado", label: "Matriculado" },
				]
			: tipo === "colaborador"
				? [
						{ value: "ativo", label: "Ativo" },
						{ value: "banco_talentos", label: "Banco de talentos" },
					]
				: [];

	return (
		<div className="flex flex-wrap gap-2">
			<select
				value={tipo}
				onChange={(event) => atualizarFiltro("tipo", event.target.value)}
				className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
			>
				<option value="todos">Todos os tipos</option>
				<option value="aluno">Aluno</option>
				<option value="colaborador">Colaborador</option>
			</select>

			<select
				value={status}
				onChange={(event) => atualizarFiltro("status", event.target.value)}
				disabled={statusOpcoes.length === 0}
				className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50"
			>
				<option value="todos">Todos os status</option>
				{statusOpcoes.map((opcao) => (
					<option key={opcao.value} value={opcao.value}>
						{opcao.label}
					</option>
				))}
			</select>
		</div>
	);
}
