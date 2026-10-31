import {it,expect} from 'vitest';
import request from 'supertest';
import {createApp} from '../src/app.js';
it('returns the standard health response',async()=>{const response=await request(createApp()).get('/api/v1/health');expect(response.status).toBe(200);expect(response.body).toMatchObject({success:true,data:{status:'ok'}})});
