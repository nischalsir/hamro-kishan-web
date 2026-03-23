import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// RouterNavLink allows className to be a function — we intentionally replace
// that with a simpler string-based API using dedicated state class props instead.
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  /** Applied in all states */
  className?: string;
  /** Merged in when the link is active */
  activeClassName?: string;
  /** Merged in when the link is inactive (not active, not pending) */
  inactiveClassName?: string;
  /** Merged in during navigation pending state */
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      inactiveClassName,
      pendingClassName,
      // FIX: removed redundant `to` destructure — it's forwarded via ...props
      ...props
    },
    ref,
  ) => {
    return (
      <RouterNavLink
        ref={ref}
        className={({ isActive, isPending }) =>
          cn(
            className,
            isActive  && activeClassName,
            isPending && pendingClassName,
            // FIX: added inactiveClassName support
            !isActive && !isPending && inactiveClassName,
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
export type { NavLinkCompatProps };