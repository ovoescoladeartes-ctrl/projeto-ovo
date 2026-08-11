"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

import { CopilotoComposer } from "./CopilotoComposer";
import { CopilotoMessageBubble } from "./CopilotoMessageBubble";
import { useCopiloto } from "./CopilotoProvider";

export function CopilotoDrawer(): React.ReactElement {
	const { messages, isDrawerOpen, isThinking, closeDrawer, submitQuestion } = useCopiloto();
	const scrollAnchorRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isThinking]);

	return (
		<Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
			<SheetContent
				ref={contentRef}
				side="right"
				className="flex w-full flex-col gap-0 p-0 sm:max-w-sm [&>button]:hidden"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					contentRef.current?.querySelector("input")?.focus();
				}}
			>
				<div className="flex items-center gap-2 px-4 py-3">
					<SheetClose asChild>
						<Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0">
							<ChevronRight className="h-4 w-4" />
							<span className="sr-only">Fechar Copiloto</span>
						</Button>
					</SheetClose>
					<SheetTitle>Copiloto</SheetTitle>
				</div>
				<Separator />

				<ScrollArea className="flex-1">
					<div className="flex flex-col gap-3 p-4">
						{messages.map((message) => (
							<CopilotoMessageBubble key={message.id} message={message} />
						))}
						{isThinking ? (
							<div className="rounded-2xl border border-border bg-card p-4">
								<p className="text-sm text-muted-foreground">Consultando os dados da escola...</p>
							</div>
						) : null}
						<div ref={scrollAnchorRef} />
					</div>
				</ScrollArea>

				<div className="p-4 pt-0">
					<CopilotoComposer onSubmit={submitQuestion} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
