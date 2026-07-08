import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: "gtg-btn-primary",
  secondary: "gtg-btn-secondary",
  outline: "gtg-btn-outline",
  ghost: "gtg-btn-ghost",
};

const sizeStyles: Record<Size, string> = {
  sm: "gtg-btn-sm",
  md: "gtg-btn-md",
  lg: "gtg-btn-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "gtg-btn",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
