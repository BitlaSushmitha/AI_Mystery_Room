import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {env} from './config/env.js';
import caseRoutes from './routes/caseRoutes.js';
import {errorHandler,notFound} from './middleware/errorHandler.js';
export function createApp(){const app=express();app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:env.clientUrl,methods:['GET','POST','PUT','OPTIONS'],allowedHeaders:['Content-Type','X-Session-Token']}));app.use(express.json({limit:'32kb'}));app.get('/api/v1/health',(req,res)=>res.json({success:true,data:{status:'ok'},message:'Service is healthy'}));app.use('/api/v1/cases',rateLimit({windowMs:60_000,limit:12,standardHeaders:true,legacyHeaders:false}));app.use('/api/v1',caseRoutes);if(env.nodeEnv==='production'){const clientDist=resolve(fileURLToPath(new URL('../../client/dist',import.meta.url)));app.use(express.static(clientDist));app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(resolve(clientDist,'index.html'),error=>{if(error)next(error)})})}app.use(notFound);app.use(errorHandler);return app}
