/**
 * API Route: /api/sessions/[id]
 * GET - Get session by ID
 * DELETE - Delete session by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sessions';

// GET /api/sessions/[id] - Get session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    let query: { _id: ObjectId } | { _id: string };
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      // If not valid ObjectId, try as string
      query = { _id: id as unknown as ObjectId };
    }
    
    const session = await collection.findOne(query);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Delete session by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    let query: { _id: ObjectId } | { _id: string };
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id as unknown as ObjectId };
    }
    
    const result = await collection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Session deleted:', id);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
