import Case from '../models/Case.js';
import { createCaseSchema, notesSchema } from '../schemas/requestSchemas.js';
import { caseSchema, validateCaseReferences } from '../schemas/caseSchema.js';
import { generateMystery } from '../services/geminiService.js';
import { createSession } from '../services/sessionService.js';
import { publicCase } from '../services/caseService.js';

function badRequest(res, details) { return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'The submitted request is invalid.', details } }); }
function aiFailure(res, message) { return res.status(502).json({ success: false, error: { code: 'AI_INVALID_OUTPUT', message, details: [] } }); }

export async function createCase(req, res, next) {
  try {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues.map(x => ({ field: x.path.join('.'), message: x.message })));
    const input = parsed.data;
    let valid;
    let references = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      let generated;
      try { generated = await generateMystery(input); }
      catch (error) { if (error.status) throw error; throw Object.assign(new Error('The mystery could not be generated. Please try again.'), { status: 502, code: 'GENERATION_FAILED' }); }
      if (!generated || typeof generated !== 'object' || Array.isArray(generated)) continue;
      generated.scenario = input.scenario;
      generated.category = input.category;
      generated.difficulty = input.difficulty;
      generated.generationMetadata = { ...(generated.generationMetadata || {}), model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', generatedAt: new Date().toISOString() };
      const parsedCase = caseSchema.safeParse(generated);
      if (!parsedCase.success) continue;
      references = validateCaseReferences(parsedCase.data, input.difficulty);
      if (!references.length) { valid = parsedCase.data; break; }
    }
    if (!valid) return aiFailure(res, 'The generated mystery did not pass validation and consistency checks after two attempts. Please retry.');
    const doc = await Case.create({ ...valid, title: input.titlePreference || valid.title, status: 'ready' });
    const { session, token } = await createSession(doc._id);
    return res.status(201).json({ success: true, data: { case: publicCase(doc, session), session: { token } }, message: 'Investigation created successfully' });
  } catch (error) { next(error); }
}

export async function getCase(req, res, next) {
  try {
    const doc = await Case.findOne({ _id: req.params.caseId, status: 'ready' });
    if (!doc) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'This case file could not be found.', details: [] } });
    return res.json({ success: true, data: publicCase(doc, req.session), message: 'Case retrieved successfully' });
  } catch (error) { next(error); }
}

export async function getEvidence(req, res, next) {
  try {
    const types = ['message', 'image', 'cctv', 'document', 'witness', 'physical'];
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    if ((req.query.type && !types.includes(req.query.type)) || !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || (req.query.search && req.query.search.length > 100)) return badRequest(res, [{ field: 'query', message: 'Use a valid evidence type, search (100 characters maximum), page, and limit (1–50).' }]);
    const doc = await Case.findOne({ _id: req.params.caseId, status: 'ready' });
    if (!doc) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'This case file could not be found.', details: [] } });
    let list = doc.evidence.map(e => e.toObject ? e.toObject() : e);
    if (req.query.type) list = list.filter(e => e.type === req.query.type);
    if (req.query.search) list = list.filter(e => e.title.toLowerCase().includes(req.query.search.toLowerCase()));
    return res.json({ success: true, data: { items: list.slice((page - 1) * limit, page * limit).map(({ _id, ...item }) => item), page, limit, total: list.length, reviewedEvidenceIds: req.session.reviewedEvidenceIds }, message: 'Evidence retrieved successfully' });
  } catch (error) { next(error); }
}

export async function getSingleEvidence(req, res, next) {
  try {
    const doc = await Case.findOne({ _id: req.params.caseId, status: 'ready' });
    const evidence = doc?.evidence.find(item => item.id === req.params.evidenceId);
    if (!evidence) return res.status(404).json({ success: false, error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence could not be found.', details: [] } });
    return res.json({ success: true, data: { ...evidence.toObject(), reviewed: req.session.reviewedEvidenceIds.includes(evidence.id) }, message: 'Evidence retrieved successfully' });
  } catch (error) { next(error); }
}

export async function markReviewed(req, res, next) {
  try {
    const doc = await Case.findOne({ _id: req.params.caseId, status: 'ready' });
    if (!doc) return res.status(404).json({ success: false, error: { code: 'CASE_NOT_FOUND', message: 'This case file could not be found.', details: [] } });
    if (!doc.evidence.some(item => item.id === req.params.evidenceId)) return res.status(404).json({ success: false, error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence could not be found.', details: [] } });
    await req.session.updateOne({ $addToSet: { reviewedEvidenceIds: req.params.evidenceId } });
    return res.json({ success: true, data: { reviewed: true }, message: 'Evidence marked as reviewed' });
  } catch (error) { next(error); }
}

export async function saveNotes(req, res, next) {
  try {
    const parsed = notesSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues.map(x => ({ field: x.path.join('.'), message: x.message })));
    req.session.notes = parsed.data.text;
    await req.session.save();
    return res.json({ success: true, data: { notes: req.session.notes }, message: 'Notes saved successfully' });
  } catch (error) { next(error); }
}
