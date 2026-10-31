import { z } from 'zod';
export const createCaseSchema=z.object({scenario:z.string().trim().min(30).max(2000),difficulty:z.enum(['easy','medium','hard']),category:z.enum(['theft','murder','missing_person','corporate_deception','historical_mystery','general']),titlePreference:z.string().trim().max(80).optional().default('')});
export const notesSchema=z.object({text:z.string().max(5000)});
export const accusationSchema=z.object({suspectId:z.string().min(1).max(80),explanation:z.string().max(1000).optional().default('')});
export const difficultyCounts={easy:{suspects:3,evidence:6},medium:{suspects:4,evidence:8},hard:{suspects:5,evidence:10}};
