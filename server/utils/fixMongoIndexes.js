import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/formagent';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the conversationhistories collection
    const db = mongoose.connection.db;
    const collection = db.collection('conversationhistories');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop any index on messageId field
    try {
      await collection.dropIndex('shortTermMemory.messages.messageId_1');
      console.log('Dropped messageId index');
    } catch (error) {
      console.log('No messageId index to drop');
    }

    // Create compound index instead of unique on messageId
    try {
      await collection.createIndex(
        { 'conversationId': 1, 'shortTermMemory.messages.messageId': 1 },
        { unique: false }
      );
      console.log('Created compound index for better performance');
    } catch (error) {
      console.log('Index creation error:', error.message);
    }

    console.log('Index fix completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixIndexes();
}

export default fixIndexes;