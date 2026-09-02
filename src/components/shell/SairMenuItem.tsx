"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { useLogout } from "./useLogout";

interface SairMenuItemProps {
	/** Elemento que dispara a confirmação — estilizado por quem chama (AppSidebar/MobileNavSheet têm layouts de nav diferentes), aqui só a lógica de confirmar + sair é compartilhada. */
	children: React.ReactNode;
}

/** Confirmação leve antes de encerrar a sessão — evita sair sem querer com um clique só. */
export function SairMenuItem({ children }: SairMenuItemProps): React.ReactElement {
	const { saindo, handleLogout } = useLogout();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sair da conta?</AlertDialogTitle>
					<AlertDialogDescription>Você vai precisar entrar de novo pra continuar usando o Trilho.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={saindo}>Cancelar</AlertDialogCancel>
					<Button type="button" variant="destructive" onClick={handleLogout} disabled={saindo}>
						{saindo ? "Saindo..." : "Sair"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
