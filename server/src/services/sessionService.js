import {createHash,randomBytes,createHmac} from 'node:crypto';
import Session from '../models/InvestigationSession.js';
import {env} from '../config/env.js';
export function hashToken(token){return createHmac('sha256',env.sessionSecret).update(token).digest('hex')}
export async function requireSession(req,res,next){try{const token=req.get('X-Session-Token');if(!token||token.length<32||token.length>256)return res.status(401).json({success:false,error:{code:'SESSION_REQUIRED',message:'A valid investigation session is required.',details:[]}});const session=await Session.findOne({caseId:req.params.caseId,sessionTokenHash:hashToken(token)});if(!session)return res.status(401).json({success:false,error:{code:'SESSION_INVALID',message:'This investigation session is invalid or expired.',details:[]}});req.session=session;next()}catch(e){next(e)}}
export async function createSession(caseId){const token=randomBytes(32).toString('base64url');const session=await Session.create({caseId,sessionTokenHash:hashToken(token)});return {session,token}}
