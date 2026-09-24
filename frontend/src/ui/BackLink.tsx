import type { ReactNode } from "react";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <div>
      <ButtonLink to={to} variant="ghost">
        <Icon name="arrow-left" size={17} />
        {children}
      </ButtonLink>
    </div>
  );
}
