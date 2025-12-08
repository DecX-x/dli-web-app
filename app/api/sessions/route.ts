/**
 * API Route: /api/sessions
 * GET - Get all sessions
 * POST - Create new session
 * DELETE - Clear all sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'sessions';

// GET /api/sessions - Get all sessions
export async function GET(request: NextRequest) {
  try {
    console.log('📥 GET /api/sessions called');
    const db = await getDatabase();
    console.log('✅ Database connected:', db.databaseName);
    const collection = db.collection(COLLECTION_NAME);
    
    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    // Fetch sessions sorted by timestamp (newest first)
    const sessions = await collection
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get total count
    const total = await collection.countDocuments();
    
    // Get stats
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: '$totalVehicles' },
          totalSessions: { $sum: 1 },
        },
      },
    ]).toArray();
    
    return NextResponse.json({
      success: true,
      data: sessions,
      total,
      stats: stats[0] || { totalVehicles: 0, totalSessions: 0 },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    console.log('📤 POST /api/sessions called');
    const db = await getDatabase();
    console.log('✅ Database connected:', db.databaseName);
    const collection = db.collection(COLLECTION_NAME);
    
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    // Create session document
    const now = new Date();
    const sessionDoc = {
      timestamp: now,
      duration: body.duration,
      counts: body.counts,
      totalVehicles: body.totalVehicles,
      averageFps: body.averageFps,
      insights: body.insights || [],
      videoInfo: body.videoInfo || null,
      trackIds: body.trackIds || [],
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await collection.insertOne(sessionDoc);
    
    console.log('✅ Session saved to MongoDB:', result.insertedId);
    
    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...sessionDoc,
      },
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions - Clear all sessions
export async function DELETE() {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const result = await collection.deleteMany({});
    
    console.log('✅ All sessions cleared:', result.deletedCount);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear sessions' },
      { status: 500 }
    );
  }
}
