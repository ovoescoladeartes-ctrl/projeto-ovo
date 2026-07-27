import { CopilotoInput } from "./CopilotoInput";

function formatarDataAtual(): string {
	const formatada = new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(new Date());

	return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

export function DashboardHeader(): React.ReactElement {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
			<CopilotoInput />
			<p className="shrink-0 text-sm text-muted-foreground sm:text-right">
				{formatarDataAtual()}
			</p>
		</div>
	);
}
