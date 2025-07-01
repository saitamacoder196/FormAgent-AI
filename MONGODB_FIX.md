# MongoDB Index Fix Guide

## Problem
If you're seeing this error:
```
E11000 duplicate key error collection: formagent.conversationhistories index: shortTermMemory.messages.messageId_1 dup key: { shortTermMemory.messages.messageId: null }
```

This means MongoDB has an old unique index that needs to be removed.

## Quick Fix

### Option 1: Run the Fix Script (Recommended)
```bash
cd server
node utils/mongodbFix.js
```

This script will:
- Connect to your MongoDB
- List all indexes
- Remove problematic messageId indexes
- Show remaining indexes

### Option 2: Manual Fix via MongoDB Shell
```bash
mongosh
use formagent
db.conversationhistories.dropIndex("shortTermMemory.messages.messageId_1")
```

### Option 3: Drop and Recreate Collection (Nuclear Option)
⚠️ **WARNING: This will delete all conversation history!**
```bash
mongosh
use formagent
db.conversationhistories.drop()
```

## Prevention
The code has been updated to:
1. Remove unique constraint from messageId
2. Generate unique messageIds with timestamp + random + counter
3. Set messageId as optional with default value
4. Handle MongoDB errors gracefully with fallback to in-memory storage

## Running Without MongoDB
FormAgent AI now works without MongoDB:
- Forms are saved with mock IDs
- Conversations are stored in memory
- All features work but data is not persisted

To run without MongoDB, simply don't set MONGODB_URI in your .env file.

## Verify Fix
After running the fix, test:
1. Save a form
2. Chat with the AI
3. Generate another form
4. All should work without duplicate key errors

## Still Having Issues?
1. Check MongoDB is running: `mongosh --eval "db.version()"`
2. Check indexes: `db.conversationhistories.getIndexes()`
3. Restart the server after fixing indexes
4. Clear browser cache and reload