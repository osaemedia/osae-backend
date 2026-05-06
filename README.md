# OSAE MEDIA Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database and update `.env` with DATABASE_URL.

3. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/user/profile
- PUT /api/user/profile
- POST /api/message/send
- GET /api/message
- PUT /api/message/:id/read

## Socket Events

- join_room
- send_message
- receive_message
- message_read
- disconnect