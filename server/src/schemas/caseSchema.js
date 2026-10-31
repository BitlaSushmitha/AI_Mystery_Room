import { z } from 'zod';

const str = z.string().min(1).max(5000);
const timestamp = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?$/));
const contentSchemas = {
  message: z.object({ participants: z.array(str).min(2), messages: z.array(z.object({ sender: str, text: str, timestamp })).min(1) }).passthrough(),
  image: z.object({ assetUrl: z.string().url().optional(), assetId: z.string().optional(), altText: str, caption: str, isIllustrative: z.boolean() }).passthrough(),
  cctv: z.object({ cameraId: str, location: str, recordingStart: timestamp, recordingEnd: timestamp, observationTranscript: str, videoAssetUrl: z.string().url().optional(), markers: z.array(z.object({ timestamp, description: str })).default([]) }).passthrough(),
  document: z.object({ documentTitle: str, source: str, createdAt: timestamp, text: str }).passthrough(),
  witness: z.object({ witnessIdentity: str, statement: str, interviewTimestamp: timestamp }).passthrough(),
  physical: z.object({ objectDescription: str, discoveryLocation: str, discoveryTimestamp: timestamp, observations: str }).passthrough()
};
const evidenceSchema = z.object({ id: z.string().min(1), type: z.enum(['message', 'image', 'cctv', 'document', 'witness', 'physical']), title: str, description: str, timestamp, content: z.record(z.unknown()), relatedSuspectIds: z.array(z.string()).default([]), relatedEventIds: z.array(z.string()).default([]), clueIds: z.array(z.string()).default([]) }).superRefine((item, ctx) => {
  const parsed = contentSchemas[item.type].safeParse(item.content);
  if (!parsed.success) for (const issue of parsed.error.issues) ctx.addIssue({ ...issue, path: ['content', ...issue.path] });
});

export const caseSchema = z.object({
  schemaVersion: z.literal(1), title: str, category: z.enum(['theft', 'murder', 'missing_person', 'corporate_deception', 'historical_mystery', 'general']), difficulty: z.enum(['easy', 'medium', 'hard']), scenario: z.string().min(30).max(2000).optional(),
  briefing: z.object({ incident: str, location: str, incidentTime: timestamp, timezone: z.string().min(1).default('UTC'), summary: str, objectives: z.array(str).min(1).max(8) }),
  suspects: z.array(z.object({ id: z.string().min(1), name: str, role: str, relationship: str, motive: str, alibi: str, publicFacts: z.array(str).min(1).max(10) })).min(3).max(5),
  evidence: z.array(evidenceSchema).min(6).max(30),
  timeline: z.array(z.object({ id: z.string().min(1), timestamp, description: str, relatedSuspectIds: z.array(z.string()).default([]), evidenceIds: z.array(z.string()).default([]), isVerified: z.boolean().default(false) })).min(3).max(30),
  solution: z.object({ culpritSuspectId: z.string().min(1), motive: str, method: str, explanation: str, decisiveEvidenceIds: z.array(z.string()).min(1), contradictionEvidenceIds: z.array(z.string()).min(1), clueExplanations: z.array(z.object({ evidenceId: z.string(), explanation: str })).min(3), redHerringExplanations: z.array(str).default([]) }),
  generationMetadata: z.object({ model: z.string().optional(), generatedAt: timestamp.optional() }).optional()
});

export function validateCaseReferences(data, difficulty) {
  const errors = [];
  const expectedSuspects = { easy: 3, medium: 4, hard: 5 }[difficulty];
  const minimumEvidence = { easy: 6, medium: 8, hard: 10 }[difficulty];
  if (data.suspects.length !== expectedSuspects) errors.push(`Expected exactly ${expectedSuspects} suspects.`);
  if (data.evidence.length < minimumEvidence) errors.push(`Expected at least ${minimumEvidence} evidence items.`);
  const suspects = new Set(data.suspects.map(item => item.id));
  const evidence = new Map(data.evidence.map(item => [item.id, item]));
  const events = new Set(data.timeline.map(item => item.id));
  if (suspects.size !== data.suspects.length) errors.push('Suspect IDs must be unique.');
  if (evidence.size !== data.evidence.length) errors.push('Evidence IDs must be unique.');
  if (new Set(data.timeline.map(item => item.id)).size !== data.timeline.length) errors.push('Timeline IDs must be unique.');
  if (!suspects.has(data.solution.culpritSuspectId)) errors.push('Culprit must reference an existing suspect.');
  const solutionRefs = [...data.solution.decisiveEvidenceIds, ...data.solution.contradictionEvidenceIds, ...data.solution.clueExplanations.map(item => item.evidenceId)];
  for (const id of solutionRefs) if (!evidence.has(id)) errors.push(`Solution references missing evidence: ${id}`);
  for (const id of data.solution.contradictionEvidenceIds) if (evidence.has(id) && evidence.get(id).relatedSuspectIds.length === 0) errors.push(`Contradiction evidence ${id} must identify a related suspect.`);
  for (const item of data.evidence) {
    for (const id of item.relatedSuspectIds) if (!suspects.has(id)) errors.push(`Evidence ${item.id} references missing suspect ${id}`);
    for (const id of item.relatedEventIds) if (!events.has(id)) errors.push(`Evidence ${item.id} references missing event ${id}`);
  }
  for (const event of data.timeline) {
    for (const id of event.relatedSuspectIds) if (!suspects.has(id)) errors.push(`Event ${event.id} references missing suspect ${id}`);
    for (const id of event.evidenceIds) if (!evidence.has(id)) errors.push(`Event ${event.id} references missing evidence ${id}`);
  }
  for (let i = 1; i < data.timeline.length; i++) if (new Date(data.timeline[i - 1].timestamp) > new Date(data.timeline[i].timestamp)) errors.push('Timeline events must be ordered chronologically.');
  if (data.evidence.filter(item => item.clueIds.length).length < 3) errors.push('At least three evidence items must contain clue references.');
  if (!data.evidence.some(item => item.type === 'message') || !data.evidence.some(item => item.type === 'document') || !data.evidence.some(item => item.type === 'cctv')) errors.push('Cases must include message, document, and CCTV evidence.');
  return errors;
}
