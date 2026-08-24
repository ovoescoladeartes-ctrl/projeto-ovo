import type { ComponentType } from "react";
import { CalendarClock, PiggyBank, Receipt, UserCheck, UserPlus, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { KpiCardData, KpiIcon } from "@/core/dashboard/types";

const ICONS: Record<KpiIcon, ComponentType<{ className?: string }>> = {
	recebido: Wallet,
	saldo: PiggyBank,
	repasses: CalendarClock,
	pendentes: Receipt,
	leads: UserPlus,
	convertidos: UserCheck,
};

const ICON_BADGE_STYLES: Record<KpiIcon, string> = {
	recebido: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
	saldo: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
	repasses: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
	pendentes: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
	leads: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
	convertidos: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
};

export function KpiCard({ icon, label, value, subtitle }: KpiCardData): React.ReactElement {
	const Icon = icon !== undefined ? ICONS[icon] : null;
	return (
		<Card className="min-w-0 p-5">
			{Icon !== null ? (
				<div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${ICON_BADGE_STYLES[icon as KpiIcon]}`}>
					<Icon className="h-5 w-5" />
				</div>
			) : null}
			<p className="break-words text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-2 break-words text-3xl font-bold text-foreground">{value}</p>
			<p className="mt-1 break-words text-sm text-muted-foreground">{subtitle}</p>
		</Card>
	);
}
