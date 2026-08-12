"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

/** Busca instantânea por prefixo do nome — mesmo debounce (~200ms) já usado em NovaPessoaDialog/PessoaCombobox. */
export function PessoasBusca(): React.ReactElement {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [valor, setValor] = useState(searchParams.get("busca") ?? "");

	// Guardado em ref (em vez de nas deps do effect) pra não reagendar o push quando o próprio
	// push muda a searchParams — evitaria um loop de navegações idênticas.
	const navegacaoRef = useRef({ router, pathname, searchParams });
	navegacaoRef.current = { router, pathname, searchParams };

	useEffect(() => {
		const timer = setTimeout(() => {
			const { router, pathname, searchParams } = navegacaoRef.current;
			const params = new URLSearchParams(searchParams.toString());
			if (valor.trim() === "") {
				params.delete("busca");
			} else {
				params.set("busca", valor);
			}
			params.delete("pagina");
			const query = params.toString();
			router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
		}, 200);
		return () => clearTimeout(timer);
	}, [valor]);

	return (
		<div className="relative w-full max-w-xs">
			<Search
				className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				strokeWidth={2.4}
			/>
			<Input
				value={valor}
				onChange={(event) => setValor(event.target.value)}
				placeholder="Buscar por nome..."
				className="rounded-[9px] pl-8 hover:border-border-strong hover:bg-subtle"
			/>
		</div>
	);
}
