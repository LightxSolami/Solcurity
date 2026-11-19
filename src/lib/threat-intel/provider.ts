import type { ThreatIntelScreeningResult, ThreatIntelTarget } from "@/lib/types";

export interface ThreatIntelProviderAdapter {
  readonly id: string;
  screen(targets: ThreatIntelTarget[]): Promise<ThreatIntelScreeningResult>;
}
