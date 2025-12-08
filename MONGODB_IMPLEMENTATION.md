# MongoDB Storage Implementation

## Overview
Penyimpanan data detection session menggunakan MongoDB Atlas via Next.js API Routes.

## Setup

### 1. Environment Variables
Buat file `.env.local` di root project:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
MONGODB_DB_NAME=vehicle_detection
```

### 2. Install Dependencies
```bash
npm install mongodb
```

## Architecture

```
┌─────────────────┐     API Routes      ┌─────────────────┐
│   Frontend      │◄──────────────────►│   MongoDB       │
│   (React)       │    /api/sessions    │   Atlas         │
└─────────────────┘                     └─────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | Get all sessions |
| POST | `/api/sessions` | Create new session |
| DELETE | `/api/sessions` | Clear all sessions |
| GET | `/api/sessions/[id]` | Get session by ID |
| DELETE | `/api/sessions/[id]` | Delete session by ID |

## Data Structure

### Session Document
```typescript
{
  _id: ObjectId,
  timestamp: Date,
  duration: number,          // seconds
  counts: {
    cars: number,
    truckBus: number,
    motorcycle: number
  },
  totalVehicles: number,
  averageFps: number,
  insights: [{
    id: string,
    message: string,
    severity: 'info' | 'warning' | 'alert',
    timestamp: Date
  }],
  videoInfo: {
    fileName: string,
    fileSize: number,
    duration: number
  },
  trackIds: number[],
  createdAt: Date,
  updatedAt: Date
}
```

## Files

- `lib/mongodb.ts` - MongoDB client connection (singleton)
- `lib/storage.ts` - Storage service (API wrapper)
- `app/api/sessions/route.ts` - Sessions API routes
- `app/api/sessions/[id]/route.ts` - Single session API routes

## Usage

### Save Session
```typescript
import { SessionStorage } from '@/lib/storage';

const sessionId = await SessionStorage.saveSession({
  duration: 120,
  counts: { cars: 10, truckBus: 5, motorcycle: 3 },
  totalVehicles: 18,
  averageFps: 25,
  insights: [],
  trackIds: [1, 2, 3, 4, 5]
});
```

### Get All Sessions
```typescript
const sessions = await SessionStorage.getAllDetectionSessions();
```

### Delete Session
```typescript
await SessionStorage.deleteSession(sessionId);
```

### Clear All
```typescript
await SessionStorage.clearAllSessions();
```

## MongoDB Atlas Setup

1. Buat akun di [MongoDB Atlas](https://cloud.mongodb.com)
2. Create new cluster (free tier available)
3. Create database user
4. Whitelist IP address (atau 0.0.0.0/0 untuk allow all)
5. Get connection string dan masukkan ke `.env.local`

## Notes

- Connection pooling handled automatically by MongoDB driver
- Singleton pattern untuk reuse connection di development (HMR)
- API routes berjalan di server-side (secure)
- Data persistent di cloud MongoDB
