import { db } from '../../db/index.js'
import { pools } from '../../db/schemas/pools.js'
import { eq } from 'drizzle-orm'

export const getPoolById = async(id: string) => {
  return db.select()
    .from(pools)
    .where(eq(pools.id, id))
}
