/**
 * Test MongoDB API directly (without Next.js server)
 * Run with: npx tsx scripts/test-api-direct.ts
 */

import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI || "xx";
const dbName = process.env.MONGODB_DB_NAME || "vehicle_detection";
const COLLECTION_NAME = 'sessions';

async function testAPI() {
  console.log('🔄 Testing MongoDB API operations...\n');
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!\n');
    
    const db = client.db(dbName);
    const collection = db.collection(COLLECTION_NAME);
    
    // Test 1: Create session (POST /api/sessions)
    console.log('📝 Test 1: Creating session...');
    const now = new Date();
    const sessionDoc = {
      timestamp: now,
      duration: 120,
      counts: { cars: 15, truckBus: 5, motorcycle: 8 },
      totalVehicles: 28,
      averageFps: 25.5,
      insights: [
        {
          id: 'insight-1',
          message: 'High traffic detected',
          severity: 'warning',
          timestamp: now.toISOString(),
        }
      ],
      videoInfo: {
        fileName: 'test-video.mp4',
        fileSize: 1024000,
        duration: 120,
      },
      trackIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      createdAt: now,
      updatedAt: now,
    };
    
    const insertResult = await collection.insertOne(sessionDoc);
    console.log('✅ Session created:', insertResult.insertedId.toString());
    
    // Test 2: Get all sessions (GET /api/sessions)
    console.log('\n📋 Test 2: Getting all sessions...');
    const sessions = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    console.log(`✅ Found ${sessions.length} session(s)`);
    
    // Test 3: Get stats
    console.log('\n📊 Test 3: Getting stats...');
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: '$totalVehicles' },
          totalSessions: { $sum: 1 },
        },
      },
    ]).toArray();
    console.log('✅ Stats:', stats[0] || { totalVehicles: 0, totalSessions: 0 });
    
    // Test 4: Get session by ID (GET /api/sessions/[id])
    console.log('\n🔍 Test 4: Getting session by ID...');
    const foundSession = await collection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Found session:', foundSession?._id.toString());
    console.log('   - Duration:', foundSession?.duration, 'seconds');
    console.log('   - Total Vehicles:', foundSession?.totalVehicles);
    console.log('   - Counts:', foundSession?.counts);
    
    // List all sessions
    console.log('\n📜 All sessions in database:');
    const allSessions = await collection.find({}).toArray();
    allSessions.forEach((s, i) => {
      console.log(`   ${i + 1}. ID: ${s._id}, Vehicles: ${s.totalVehicles}, Date: ${s.timestamp}`);
    });
    
    console.log('\n✅ All tests passed! MongoDB is working correctly.');
    console.log('\n💡 If data is not showing in your app:');
    console.log('   1. Make sure npm run dev is running');
    console.log('   2. Check browser console for errors');
    console.log('   3. Try saving a session from the UI');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testAPI();
