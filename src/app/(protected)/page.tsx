import { getServerSession } from "@/core/auth/getServerSession";

export default async function HomePage(): Promise<React.ReactElement> {
	const session = await getServerSession();

	
	return (
		<div>
			<h1 className="text-lg font-semibold text-slate-900">Bem-vinda {session?.displayName}</h1>
			<p className="mt-2 text-sm text-slate-500">
				Sessão ativa como <span className="font-medium">{session?.role}</span>. Os módulos de
				Financeiro e Comunicação entram aqui nas próximas etapas.
			</p>
		</div>
	);
}
