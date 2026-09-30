import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/Models/Exam';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const resolvedParams = await params;
    
    const updatedExam = await Exam.findByIdAndUpdate(
      resolvedParams.id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedExam) return NextResponse.json({ success: false }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedExam });
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    
    const deletedExam = await Exam.findByIdAndDelete(resolvedParams.id);
    if (!deletedExam) return NextResponse.json({ success: false }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}