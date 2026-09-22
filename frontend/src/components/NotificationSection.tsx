import type { CSSProperties, ReactNode } from "react";
import s from "./NotificationSection.module.css";

type Props = {
  title: string;
  collapsible?: boolean;
  headingId?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  children: ReactNode;
};

export function NotificationSection({title, collapsible = false, headingId, className, style, ariaLabel, children}: Props) {
  if (!collapsible) return <section className={className} style={style} aria-label={ariaLabel} aria-labelledby={headingId}>
    <h2 id={headingId}>{title}</h2><div className={s.body}>{children}</div>
  </section>;
  return <details className={s.panel}>
    <summary className={s.heading}><h2 id={headingId}>{title}</h2><span className={s.chevron} aria-hidden="true" /></summary>
    <div className={s.content}>{children}</div>
  </details>;
}
