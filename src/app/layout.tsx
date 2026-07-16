import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "OVO",
	description: "Sistema de gestão da escola OVO — financeiro e comunicação",
};

interface RootLayoutProps {
	children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
	return (
		<html lang="pt-BR">
			<body>{children}</body>
		</html>
	);
}
