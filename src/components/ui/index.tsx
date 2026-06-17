import Link from "next/link";
import type { ReactNode } from "react";

type Div = React.HTMLAttributes<HTMLDivElement>;

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Section({
  soft,
  tight,
  className,
  children,
  ...rest
}: Div & { soft?: boolean; tight?: boolean }) {
  return (
    <section
      className={cx("s-section", soft && "s-section--soft", tight && "s-section--tight", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function Container({ className, children, ...rest }: Div) {
  return (
    <div className={cx("s-container", className)} {...rest}>
      {children}
    </div>
  );
}

export function Eyebrow({ className, children, ...rest }: Div) {
  return (
    <p className={cx("s-eyebrow", className)} {...rest}>
      {children}
    </p>
  );
}

export function Heading({
  level = 2,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 }) {
  const Tag = (`h${level}`) as "h1" | "h2" | "h3";
  const sizeClass = level === 1 ? "s-h1" : level === 2 ? "s-h2" : "s-h3";
  return (
    <Tag className={cx("s-display", sizeClass, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Lede({ className, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("s-lede", className)} {...rest}>
      {children}
    </p>
  );
}

export function Body({ className, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("s-body", className)} {...rest}>
      {children}
    </p>
  );
}

export function Metric({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cx("s-metric", className)} {...rest}>
      {children}
    </span>
  );
}

type ButtonProps = {
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "lg";
  href?: string;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = cx(
    "s-btn",
    `s-btn--${variant}`,
    size === "lg" && "s-btn--lg",
    className
  );
  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:");
    if (external) {
      return (
        <a className={cls} href={href}>
          {children}
        </a>
      );
    }
    return (
      <Link className={cls} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  pad = true,
  className,
  children,
  ...rest
}: Div & { pad?: boolean }) {
  return (
    <div className={cx("s-card", pad && "s-card--pad", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardLink({
  href,
  pad = true,
  className,
  children,
}: {
  href: string;
  pad?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx("s-card", "s-card--link", pad && "s-card--pad", className)}>
      {children}
    </Link>
  );
}

export function Pill({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cx("s-pill", className)} {...rest}>
      {children}
    </span>
  );
}
