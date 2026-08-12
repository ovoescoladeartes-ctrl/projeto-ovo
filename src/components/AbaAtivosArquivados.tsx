"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const OPCOES = [
	{ value: "ativos", label: "Ativos" },
	{ value: "arquivados", label: "Arquivados" },
] as const;

/**
 * Segmented control Ativos/Arquivados, controlado pelo searchParam `arquivados` (mesma rota,
 * querystring diferente) — pill preenchida no estado ativo, conforme wireframe de Cadastro.
 */
export function AbaAtivosArquivados(): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const aba = searchParams.get("arquivados") === "1" ? "arquivados" : "ativos";

	function mudarAba(valor: string): void {
		const params = new URLSearchParams(searchParams.toString());
		if (valor === "arquivados") {
			params.set("arquivados", "1");
		} else {
			params.delete("arquivados");
		}
		const query = params.toString();
		router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
	}

	return (
		<div className="inline-flex h-[30px] items-center gap-0.5 rounded-lg border-[1.5px] border-border-strong bg-track p-0.5">
			{OPCOES.map((opcao) => (
				<button
					key={opcao.value}
					type="button"
					onClick={() => mudarAba(opcao.value)}
					aria-pressed={aba === opcao.value}
					className={cn(
						"cursor-pointer rounded-[6px] px-3 py-1 text-[13.5px] transition-colors",
						aba === opcao.value
							? "bg-foreground font-semibold text-background hover:bg-foreground/80"
							: "font-normal text-muted-foreground hover:bg-subtle hover:text-foreground",
					)}
				>
					{opcao.label}
				</button>
			))}
		</div>
	);
}
