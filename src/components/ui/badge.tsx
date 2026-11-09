import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Fondos oscuros (dark, error) llevan texto blanco (text-on-dark).
// Ecru solo con texto oscuro. Éxito no se usa como fondo ni como texto:
// su contraste es menor a 4.5:1, así que solo colorea el ícono.
// El crema no se usa como relleno: las etiquetas neutras van en gris claro.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        dark: "bg-primary text-on-dark",
        accent: "bg-ecru text-ink",
        muted: "bg-surface-muted text-ink",
        outline: "border-border bg-card text-ink",
        success: "border-border bg-card text-ink [&>svg]:text-success",
        error: "bg-error text-on-dark",
      },
    },
    defaultVariants: {
      variant: "dark",
    },
  }
)

function Badge({
  className,
  variant = "dark",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
