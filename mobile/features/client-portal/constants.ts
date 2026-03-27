/**
 * Maps internal sprint names to client-friendly phase names.
 */
export const FRIENDLY_PHASE_NAMES: Record<string, string> = {
  "Sprint 1: Design & Approvals": "Design Phase",
  "Sprint 2: Civil & Demolition": "Site Preparation",
  "Sprint 3: MEP (Mech, Elec, Plumb)": "Electrical & Plumbing",
  "Sprint 4: Woodwork & Carpentry": "Carpentry & Woodwork",
  "Sprint 5: Finishing & Painting": "Finishing Touches",
  "Sprint 6: Handover & Snag List": "Final Handover",
};

/**
 * Returns a friendly phase name for a sprint, falling back to a cleaned name.
 */
export function getFriendlyPhaseName(sprintName: string): string {
  if (FRIENDLY_PHASE_NAMES[sprintName]) {
    return FRIENDLY_PHASE_NAMES[sprintName];
  }
  // Strip "Sprint N: " prefix if present
  return sprintName.replace(/^Sprint\s*\d+:\s*/i, "").trim() || sprintName;
}
