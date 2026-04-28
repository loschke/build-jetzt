/**
 * Org-Membership-Validation für Multi-Instanz-Betrieb.
 *
 * Jede Vercel-Deployment-Instanz wird über AUTH_REQUIRED_ORG_SLUG an eine
 * Organization in loschke-auth gebunden. Login schlägt fehl, wenn der User in
 * dieser Org keine Membership hat.
 *
 * Ist AUTH_REQUIRED_ORG_SLUG nicht gesetzt, wird die Prüfung übersprungen
 * (z.B. Development gegen lokale Auth ohne Org-Setup).
 */
import type { IdTokenClaims, OrgMembership } from "./oidc"

export type OrgMembershipFailure =
  | { reason: "no_org_required" }
  | { reason: "no_membership"; required: string }
  | { reason: "membership_ok"; org: OrgMembership }

export function checkOrgMembership(claims: IdTokenClaims): OrgMembershipFailure {
  const required = process.env.AUTH_REQUIRED_ORG_SLUG?.trim()
  if (!required) return { reason: "no_org_required" }

  const orgs = claims.organizations ?? []
  const match = orgs.find((o) => o.slug === required)
  if (!match) return { reason: "no_membership", required }

  return { reason: "membership_ok", org: match }
}

export function getOrgRole(claims: IdTokenClaims, slug: string): string | null {
  const orgs = claims.organizations ?? []
  return orgs.find((o) => o.slug === slug)?.role ?? null
}
