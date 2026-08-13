export function CopilotoThinkingBubble(): React.ReactElement {
	return (
		<div
			className="flex w-fit items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3.5"
			role="status"
			aria-label="Copiloto está pensando"
		>
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-pulse [animation-delay:-0.3s]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-pulse [animation-delay:-0.15s]" />
			<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-pulse" />
		</div>
	);
}
