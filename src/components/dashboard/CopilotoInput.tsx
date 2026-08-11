"use client";

import { Search } from "lucide-react";

import { useCopiloto } from "@/components/copiloto/CopilotoProvider";
import { Input } from "@/components/ui/input";

export function CopilotoInput(): React.ReactElement {
	const { openDrawer } = useCopiloto();

	return (
		<div className="relative w-full sm:max-w-md">
			<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Pergunte algo sobre a escola..."
				readOnly
				onClick={openDrawer}
				onFocus={openDrawer}
				className="cursor-pointer rounded-full bg-card pl-9"
			/>
		</div>
	);
}
