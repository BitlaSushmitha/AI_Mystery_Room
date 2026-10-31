import mongoose from 'mongoose';
const schema=new mongoose.Schema({caseId:{type:mongoose.Schema.Types.ObjectId,ref:'Case',required:true,index:true},sessionTokenHash:{type:String,required:true,unique:true,select:false},reviewedEvidenceIds:{type:[String],default:[]},notes:{type:String,default:'',maxlength:5000},accusation:{suspectId:String,explanation:String,isCorrect:Boolean,submittedAt:Date},status:{type:String,enum:['in_progress','completed'],default:'in_progress'}},{timestamps:true,collection:'investigationSessions'});
schema.index({caseId:1,createdAt:-1});
export default mongoose.models.InvestigationSession||mongoose.model('InvestigationSession',schema);
