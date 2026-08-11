import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { CopilotoMessage } from "@/core/copiloto/types";

export function CopilotoMessageBubble({ message }: { message: CopilotoMessage }): React.ReactElement {
	if (message.role === "user") {
		return (
			<div className="flex justify-end">
				<p className="max-w-[85%] rounded-2xl bg-foreground px-4 py-2.5 text-sm text-background">
					{message.texto}
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border bg-card p-4">
			<p className="text-sm text-card-foreground">{message.texto}</p>
			{message.cta ? (
				<Button asChild variant="outline" size="sm" className="mt-3">
					<Link href={message.cta.href}>{message.cta.label}</Link>
				</Button>
			) : null}
		</div>
	);
}
