"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

import { AlterarSenhaMenuItem } from "./AlterarSenhaMenuItem";

interface UserMenuProps {
	displayName: string;
	email: string;
}

function getInitials(displayName: string): string {
	const parts = displayName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase();
}

/**
 * Avatar como atalho no header mobile da Dashboard — só mostra quem está logado (nome +
 * e-mail). Não duplica "Alterar senha" aqui: essa ação já vive no rodapé de conta do
 * drawer mobile (`MobileNavSheet`), mesmo padrão do desktop — ver `UserMenu` abaixo.
 */
export function UserAvatarMenu({ displayName, email }: UserMenuProps): React.ReactElement {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="ghost" className="h-11 w-11 rounded-full p-0" aria-label="Conta">
					<Avatar className="h-8 w-8 rounded-full">
						<AvatarFallback className="rounded-full bg-primary text-sm font-medium text-primary-foreground">
							{getInitials(displayName)}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<div className="px-2 py-1.5 text-sm">
					<p className="truncate font-medium">{displayName || "Usuária"}</p>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Rodapé de conta — avatar + nome + e-mail, bloco inteiro clicável, abre um menu
 * ancorado ACIMA (`side="top"`) com as ações da própria conta. Só "Alterar senha" por
 * ora (`AlterarSenhaMenuItem`); estrutura já comporta mais itens depois. "Sair" não
 * mora aqui — vive no menu principal (`SairMenuItem`), sempre visível.
 */
export function UserMenu({ displayName, email }: UserMenuProps): React.ReactElement {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" aria-label="Menu de conta">
							<Avatar className="h-8 w-8 rounded-full">
								<AvatarFallback className="rounded-full bg-primary text-sm font-medium text-primary-foreground">
									{getInitials(displayName)}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{displayName || "Usuária"}</span>
								<span className="truncate text-xs text-muted-foreground">{email}</span>
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="w-56">
						<AlterarSenhaMenuItem email={email} />
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
