/**
 * Module Federation remote type declarations.
 *
 * The shared UI remote (scope `sharedUi`) exposes standalone React card
 * components, resolved at runtime by webpack. Ambient declarations let the
 * `import ... from "sharedUi/..."` statements type-check.
 */
declare module "sharedUi/TotalPendapatanCard" {
  import type { ComponentType } from "react";

  export interface TotalPendapatanCardProps {
    value: number;
    delta?: number;
    loading?: boolean;
  }

  const TotalPendapatanCard: ComponentType<TotalPendapatanCardProps>;
  export default TotalPendapatanCard;
}

declare module "sharedUi/TransaksiCard" {
  import type { ComponentType } from "react";

  export interface TransaksiCardProps {
    value: number;
    delta?: number;
    loading?: boolean;
  }

  const TransaksiCard: ComponentType<TransaksiCardProps>;
  export default TransaksiCard;
}
