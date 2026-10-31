import { describe, it, expect } from 'vitest';
import { createCaseSchema, difficultyCounts } from '../src/schemas/requestSchemas.js';
import { caseSchema, validateCaseReferences } from '../src/schemas/caseSchema.js';

function fixture(difficulty = 'easy') {
  const count = difficultyCounts[difficulty];
  const suspects = Array.from({ length: count.suspects }, (_, i) => ({ id: `s${i}`, name: `Suspect ${i}`, role: 'Guest', relationship: 'Attended the gala', motive: 'A plausible fictional motive', alibi: 'Says they were in the lobby', publicFacts: ['Had access'] }));
  const types = ['message', 'document', 'cctv', 'witness', 'physical', 'image', ...Array(Math.max(0, count.evidence - 6)).fill('document')];
  const evidence = types.map((type, i) => {
    const content = {
      message: { participants: ['Alex', 'Jordan'], messages: [{ sender: 'Alex', text: 'Record', timestamp: '2026-01-01T19:00:00' }] },
      document: { documentTitle: 'Record', source: 'Archive', createdAt: '2026-01-01T19:00:00', text: 'Record' },
      cctv: { cameraId: 'C1', location: 'Gallery', recordingStart: '2026-01-01T19:00:00', recordingEnd: '2026-01-01T20:00:00', observationTranscript: 'A person enters.', markers: [] },
      witness: { witnessIdentity: 'Staff member', statement: 'I saw someone leave.', interviewTimestamp: '2026-01-01T20:00:00' },
      physical: { objectDescription: 'A glove', discoveryLocation: 'Gallery', discoveryTimestamp: '2026-01-01T19:30:00', observations: 'Blue fibers.' },
      image: { altText: 'Illustrative image', caption: 'Gallery', isIllustrative: true }
    }[type];
    return { id: `e${i}`, type, title: `Evidence ${i}`, description: 'A fictional clue.', timestamp: '2026-01-01T19:00:00', content, relatedSuspectIds: ['s0'], relatedEventIds: ['t0'], clueIds: i < 3 ? [`clue${i}`] : [] };
  });
  const timeline = [
    { id: 't0', timestamp: '2026-01-01T19:00:00', description: 'A guest arrives.', relatedSuspectIds: ['s0'], evidenceIds: ['e0'], isVerified: true },
    { id: 't1', timestamp: '2026-01-01T19:30:00', description: 'The lights flicker.', relatedSuspectIds: [], evidenceIds: ['e1'], isVerified: false },
    { id: 't2', timestamp: '2026-01-01T20:00:00', description: 'The item is reported missing.', relatedSuspectIds: [], evidenceIds: ['e2'], isVerified: true }
  ];
  return { schemaVersion: 1, title: 'The Winter Case', category: 'theft', difficulty, scenario: 'A mysterious jewel disappears during a private winter gala.', briefing: { incident: 'A jewel disappears.', location: 'North Gallery', incidentTime: '2026-01-01T19:30:00', timezone: 'UTC', summary: 'A case begins.', objectives: ['Identify the culprit'] }, suspects, evidence, timeline, solution: { culpritSuspectId: 's0', motive: 'Money', method: 'A simple fictional switch.', explanation: 'The records contradict the alibi.', decisiveEvidenceIds: ['e0', 'e1'], contradictionEvidenceIds: ['e1'], clueExplanations: [{ evidenceId: 'e0', explanation: 'The timestamp contradicts the claim.' }, { evidenceId: 'e1', explanation: 'A record conflicts with the alibi.' }, { evidenceId: 'e2', explanation: 'The timeline shows access.' }], redHerringExplanations: ['The glove belonged to a caterer.'] }, generationMetadata: { model: 'fixture', generatedAt: '2026-01-01T20:00:00' } };
}

describe('case request validation', () => {
  it('requires a non-trivial fictional scenario', () => expect(createCaseSchema.safeParse({ scenario: 'too short', difficulty: 'easy', category: 'theft' }).success).toBe(false));
  it('accepts a valid create request', () => expect(createCaseSchema.safeParse({ scenario: 'A valuable painting vanishes during a private event.', difficulty: 'medium', category: 'theft' }).success).toBe(true));
  it('provides difficulty counts', () => expect(difficultyCounts.hard).toEqual({ suspects: 5, evidence: 10 }));
});
describe('generated case validation', () => {
  it('validates a consistent easy case with typed evidence', () => { const data = fixture(); expect(caseSchema.safeParse(data).success).toBe(true); expect(validateCaseReferences(data, 'easy')).toEqual([]); });
  it('rejects a missing culprit reference', () => { const data = fixture(); data.solution.culpritSuspectId = 'absent'; expect(validateCaseReferences(data, 'easy')).toContain('Culprit must reference an existing suspect.'); });
  it('rejects too few suspects for selected difficulty', () => { const data = fixture(); expect(validateCaseReferences(data, 'medium').some(x => x.includes('suspects'))).toBe(true); });
});
