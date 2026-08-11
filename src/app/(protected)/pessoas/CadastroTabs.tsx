"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Navegação entre as duas telas de Cadastro (Pessoas/Turmas) — não há layout compartilhado entre
 * `/pessoas` e `/pessoas/turmas`, por isso este componente é renderizado no topo de cada uma.
 * Variante sublinhada, mesma regra MANDATÓRIA nº 7 de docs/design.md.
 */
export function CadastroTabs(): React.ReactElement {
	const pathname = usePathname();
	const ativo = pathname === "/pessoas/turmas" ? "turmas" : "pessoas";

	return (
		<Tabs value={ativo} className="mb-4">
			<TabsList className="bg-transparent p-0">
				<TabsTrigger
					value="pessoas"
					asChild
					className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					<Link href="/pessoas">Pessoas</Link>
				</TabsTrigger>
				<TabsTrigger
					value="turmas"
					asChild
					className="ml-6 rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
				>
					<Link href="/pessoas/turmas">Turmas</Link>
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
