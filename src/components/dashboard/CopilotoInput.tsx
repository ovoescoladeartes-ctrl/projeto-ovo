import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function CopilotoInput(): React.ReactElement {
	return (
		<div className="relative w-full sm:max-w-md">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Pergunte algo sobre a escola..."
				disabled
				className="rounded-full bg-card pl-9 pr-20"
			/>
			<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70">
				em breve
			</span>
		</div>
	);
}
