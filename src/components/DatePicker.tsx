"use client";

import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
	/** Data no formato ISO `yyyy-MM-dd` (mesmo formato de `<input type="date">`), ou "" se vazio. */
	value: string;
	onChange: (value: string) => void;
	id?: string;
	disabled?: boolean;
	placeholder?: string;
}

/**
 * Substitui `<input type="date">` nativo (regra do design.md) — `Calendar` do shadcn dentro de um
 * `Popover`, mesmo componente em todo breakpoint. `parseISO`/`format` (date-fns) em vez de `new
 * Date(string)` evita a armadilha de `new Date("yyyy-MM-dd")` interpretar a string como UTC —
 * aqui o valor nunca sai do fuso local, então não precisa do workaround `timeZone: "UTC"" que
 * `formatarData`/afins usam em outros lugares do app.
 */
export function DatePicker({ value, onChange, id, disabled = false, placeholder = "Selecionar data" }: DatePickerProps): React.ReactElement {
	const [open, setOpen] = useState(false);

	const dataSelecionada = value !== "" ? parseISO(value) : undefined;
	const dataValida = dataSelecionada !== undefined && isValid(dataSelecionada) ? dataSelecionada : undefined;

	function handleSelect(data: Date | undefined): void {
		onChange(data !== undefined ? format(data, "yyyy-MM-dd") : "");
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					id={id}
					variant="outline"
					disabled={disabled}
					className={cn("w-full justify-start gap-2 font-normal", dataValida === undefined && "text-muted-foreground")}
				>
					<CalendarIcon className="h-4 w-4 shrink-0" />
					{dataValida !== undefined ? format(dataValida, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar mode="single" selected={dataValida} onSelect={handleSelect} locale={ptBR} autoFocus />
			</PopoverContent>
		</Popover>
	);
}
