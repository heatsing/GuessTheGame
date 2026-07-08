import { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({
  children,
  interactive = false,
  className,
  ...props
}: CardProps) {
  const classes = ["gtg-card", interactive && "gtg-card-interactive", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="gtg-card-header">{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="gtg-card-body">{children}</div>;
}
