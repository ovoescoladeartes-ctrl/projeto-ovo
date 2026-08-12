import * as React from "react"

import { cn } from "@/lib/utils"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean
}

/**
 * Pill clicável de seleção múltipla (ex.: papel Aluno/Professor) — preenchido quando ativo,
 * contornado quando inativo. Diferente de Checkbox: não é pra seleção em massa de linha de
 * tabela, é pra alternar um valor categórico (docs/design.md, regra "Chip").
 */
const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, pressed, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-input bg-background text-foreground hover:bg-subtle",
        className
      )}
      {...props}
    />
  )
)
Chip.displayName = "Chip"

export { Chip }
