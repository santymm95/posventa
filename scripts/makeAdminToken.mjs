import { SignJWT } from 'jose';
import dotenv from 'dotenv';
dotenv.config();

const secret = (process.env.JWT_SECRET || 'posventa-dev-secret');
const encoder = new TextEncoder();

async function run() {
  const token = await new SignJWT({ userId: 1, email: 'admin@gmail.com', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(secret));

  console.log(token);
}

run().catch(err => { console.error(err); process.exit(1); });
