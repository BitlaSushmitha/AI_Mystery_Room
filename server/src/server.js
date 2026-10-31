import {createApp} from './app.js';
import {connectDatabase} from './config/database.js';
import {env,validateEnv} from './config/env.js';
validateEnv();
await connectDatabase(env.mongoUri);
const app=createApp();
app.listen(env.port,()=>console.log(`AI Mystery Room API listening on port ${env.port}`));
