import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {env} from './config/env.js';
import caseRoutes from './routes/caseRoutes.js';
import {errorHandler,notFound} from './middleware/errorHandler.js';
export function createApp(){const app=express();app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:env.clientUrl,methods:['GET','POST','PUT','OPTIONS'],allowedHeaders:['Content-Type','X-Session-Token']}));app.use(express.json({limit:'32kb'}));app.get('/api/v1/health',(req,res)=>res.json({success:true,data:{status:'ok'},message:'Service is healthy'}));app.use('/api/v1/cases',rateLimit({windowMs:60_000,limit:12,standardHeaders:true,legacyHeaders:false}));app.use('/api/v1',caseRoutes);app.use(notFound);app.use(errorHandler);return app}
