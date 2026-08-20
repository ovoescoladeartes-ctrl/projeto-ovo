"use client";

import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Role } from "@/core/auth/Role";
import { cn } from "@/lib/utils";

import { childMaisEspecificoAtivo, grupoDaRota, NAV_ITEMS, rotaAtiva } from "./navItems";

interface MobileNavSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role: Role;
}

/**
 * Menu mobile em tela cheia — versão exclusiva do mobile (regra do design.md sobre header
 * mobile), separada do `Sidebar`/rail do shadcn usado no desktop (`AppSidebar.tsx`). Reaproveita
 * os mesmos `NAV_ITEMS`/helpers de `navItems.ts`, sem duplicar a lista de navegação. Sem avatar —
 * o atalho de conta já vive no header da Dashboard (`UserAvatarMenu`).
 */
export function MobileNavSheet({ open, onOpenChange, role }: MobileNavSheetProps): React.ReactElement {
	const pathname = usePathname();
	const [gruposAbertos, setGruposAbertos] = useState<ReadonlySet<string>>(() => {
		const grupo = grupoDaRota(pathname);
		return grupo !== null ? new Set([grupo]) : new Set();
	});

	useEffect(() => {
		const grupo = grupoDaRota(pathname);
		if (grupo === null) {
			return;
		}
		setGruposAbertos((atual) => (atual.has(grupo) ? atual : new Set(atual).add(grupo)));
	}, [pathname]);

	function alternarGrupo(label: string): void {
		setGruposAbertos((atual) => {
			const proximo = new Set(atual);
			if (proximo.has(label)) {
				proximo.delete(label);
			} else {
				proximo.add(label);
			}
			return proximo;
		});
	}

	function fechar(): void {
		onOpenChange(false);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="left" className="flex h-dvh w-screen max-w-none flex-col gap-0 border-none p-0 [&>button]:hidden">
				<div className="flex items-center justify-between px-4 py-3">
					<SheetTitle className="text-base font-semibold">Menu</SheetTitle>
					<SheetClose asChild>
						<Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Fechar menu">
							<X className="h-5 w-5" />
						</Button>
					</SheetClose>
				</div>
				<Separator />

				<ScrollArea className="flex-1">
					<nav className="flex flex-col">
						{NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
							if (item.children !== undefined) {
								const childAtivoHref = childMaisEspecificoAtivo(item.children, pathname);
								const aberto = gruposAbertos.has(item.label);

								return (
									<div key={item.label} className="border-b border-border">
										<button
											type="button"
											onClick={() => alternarGrupo(item.label)}
											aria-expanded={aberto}
											className="flex w-full items-center gap-3 px-4 py-4 text-left text-base text-foreground"
										>
											<item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
											<span className={cn("flex-1", childAtivoHref !== null && "font-semibold")}>{item.label}</span>
											<ChevronDown
												className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", aberto && "rotate-180")}
											/>
										</button>
										{aberto ? (
											<div className="flex flex-col pb-2">
												{item.children.map((child) => (
													<Link
														key={child.href}
														href={child.href}
														onClick={fechar}
														className={cn(
															"py-3 pl-[3.25rem] pr-4 text-base",
															child.href === childAtivoHref ? "font-semibold text-foreground" : "text-muted-foreground",
														)}
													>
														{child.label}
													</Link>
												))}
											</div>
										) : null}
									</div>
								);
							}

							const isActive = item.href !== null && rotaAtiva(pathname, item.href);

							return (
								<Link
									key={item.label}
									href={item.href ?? "#"}
									onClick={fechar}
									className={cn(
										"flex items-center gap-3 border-b border-border px-4 py-4 text-base text-foreground",
										isActive && "font-semibold",
									)}
								>
									<item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}
