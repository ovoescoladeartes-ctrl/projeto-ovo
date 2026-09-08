import { PageHeader } from "@/components/shell/PageHeader";

function formatarDataAtual(): string {
	const formatada = new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(new Date());

	return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

/**
 * Dashboard é a única rota sem breadcrumb (regra 12 do design.md — é a raiz, não há pra onde
 * "voltar") — por isso não passa `breadcrumb` pro `PageHeader`. `spacing={false}` porque esse
 * header já vive dentro do `flex flex-col gap-6` de `(protected)/page.tsx`, que já espaça os
 * irmãos sozinho.
 */
export function DashboardHeader(): React.ReactElement {
	return <PageHeader title="Dashboard" subtitle={<p className="text-sm text-muted-foreground">{formatarDataAtual()}</p>} spacing={false} />;
}
