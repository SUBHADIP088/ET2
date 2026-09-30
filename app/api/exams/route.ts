import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/models/Exam';

export async function GET() {
  try {
    await connectToDatabase();
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: exams });
  } catch (error: any) {
    console.error("GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    // Log what the frontend actually sends to the terminal
    console.log("Saving new form data:", body);
    
    const exam = await Exam.create(body);
    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error);
    // Return the actual error message to the frontend alert
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}