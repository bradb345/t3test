import { db } from "./index"
import { user } from "./schema"
import { eq } from "drizzle-orm"

export async function getUserByAuthId(authId: string) {
  const users = await db.select()
    .from(user)
    .where(eq(user.auth_id, authId))
    .limit(1)
  
  return users[0]
} 