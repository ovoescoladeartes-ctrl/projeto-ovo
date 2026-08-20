import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: "OVO",
	description: "Sistema de gestão da escola OVO — financeiro e comunicação",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

interface RootLayoutProps {
	children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
	return (
		<html lang="pt-BR" className={inter.variable}>
			<body className="font-sans">{children}</body>
		</html>
	);
}
