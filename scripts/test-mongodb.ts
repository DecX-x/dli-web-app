/**
 * Test MongoDB Connection
 * Run with: npx ts-node scripts/test-mongodb.ts
 */

import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = "mongodb+srv://mellbendlsatria_db_user:fXjfZIT7BN5skuZa@cluster0.bnugqvf.mongodb.net/?appName=Cluster0";
const dbName = "vehicle_detection";

async function testConnection() {
  console.log('🔄 Connecting to MongoDB...');
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    // Ping
    await client.db("admin").command({ ping: 1 });
    console.log('✅ Ping successful!');
    
    // Test insert
    const db = client.db(dbName);
    const collection = db.collection('sessions');
    
    const testDoc = {
      timestamp: new Date(),
      duration: 60,
      counts: { cars: 5, truckBus: 2, motorcycle: 3 },
      totalVehicles: 10,
      averageFps: 25,
      insights: [],
      trackIds: [1, 2, 3],
      createdAt: new Date(),
      updatedAt: new Date(),
      _test: true, // Mark as test document
    };
    
    const result = await collection.insertOne(testDoc);
    console.log('✅ Test document inserted:', result.insertedId);
    
    // Verify
    const found = await collection.findOne({ _id: result.insertedId });
    console.log('✅ Document found:', found?._id);
    
    // Cleanup test document
    await collection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test document cleaned up');
    
    // Count documents
    const count = await collection.countDocuments();
    console.log(`📊 Total documents in sessions: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();
