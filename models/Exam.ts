import mongoose, { Schema, Document, models } from 'mongoose';

export interface IDocLink {
  title: string;
  url: string;
}

export interface IStage {
  _id?: string;
  stageName: string;
  examDate?: Date | null;
  status: 'Waiting for Exam' | 'Pending Result' | 'Cleared' | 'Not Cleared' | 'Not Appeared';
  remarks?: string;
  documents?: IDocLink[];
}

export interface IExam extends Document {
  examName: string;
  portalId?: string;
  portalPassword?: string;
  formFillDate?: Date; // Made optional
  formLastDate: Date;  // Added as required
  amountPaid: number;
  documents?: IDocLink[];
  stages: IStage[];
}

const DocLinkSchema = new Schema<IDocLink>({
  title: { type: String, required: true },
  url: { type: String, required: true }
});

const StageSchema = new Schema<IStage>({
  stageName: { type: String, required: true },
  examDate: { type: Date, required: false },
  status: { 
     type: String, 
     enum: ['Waiting for Exam', 'Pending Result', 'Cleared', 'Not Cleared', 'Not Appeared'], 
     default: 'Waiting for Exam' 
   },
  remarks: { type: String, required: false },
  documents: { type: [DocLinkSchema], default: [] }
});

const ExamSchema = new Schema<IExam>({
  examName: { type: String, required: true },
  portalId: { type: String, required: false },
  portalPassword: { type: String, required: false },
  formFillDate: { type: Date, required: false }, // Optional
  formLastDate: { type: Date, required: true },  // Required
  amountPaid: { type: Number, required: true, default: 0 },
  documents: { type: [DocLinkSchema], default: [] },
  stages: [StageSchema],
}, { timestamps: true });

// Prevent caching issues in Next.js
if (mongoose.models.Exam) {
  delete mongoose.models.Exam;
}

export default mongoose.model<IExam>('Exam', ExamSchema);