"use client";

import * as React from "react";
import { navigate } from "./navigation";

type LinkProps = Omit<React.ComponentProps<"a">, "href"> & {
  href: string;
  replace?: boolean;
  prefetch?: boolean;
  scroll?: boolean;
};

/**
 * Substituto de `next/link` para a versão SPA: mantém `<a>` real (acessível,
 * abre em nova aba com ctrl+clique) e navega pelo roteador de hash.
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, prefetch: _prefetch, scroll: _scroll, onClick, ...props },
  ref
) {
  return (
    <a
      ref={ref}
      href={`#${href}`}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        navigate(href, replace);
      }}
      {...props}
    />
  );
});

export default Link;
