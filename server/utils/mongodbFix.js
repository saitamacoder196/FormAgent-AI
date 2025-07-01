import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropProblematicIndexes() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/formagent';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('conversationhistories');
    
    // List all indexes
    console.log('\nListing all indexes...');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`Index: ${index.name}`, index.key);
    });
    
    // Drop problematic indexes
    const indexesToDrop = [
      'shortTermMemory.messages.messageId_1',
      'messageId_1',
      'messages.messageId_1'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          console.log(`ℹ️  Index ${indexName} not found (already dropped)`);
        } else {
          console.error(`❌ Error dropping ${indexName}:`, error.message);
        }
      }
    }
    
    // Also try dropping by key pattern
    try {
      await collection.dropIndex({ 'shortTermMemory.messages.messageId': 1 });
      console.log('✅ Dropped index by key pattern');
    } catch (error) {
      console.log('ℹ️  No index found by key pattern');
    }
    
    // List indexes after cleanup
    console.log('\nIndexes after cleanup:');
    const remainingIndexes = await collection.indexes();
    remainingIndexes.forEach(index => {
      console.log(`Index: ${index.name}`, index.key);
    });
    
    console.log('\n✅ Index cleanup completed successfully!');
    console.log('You can now use the application without duplicate key errors.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Execute immediately
dropProblematicIndexes();