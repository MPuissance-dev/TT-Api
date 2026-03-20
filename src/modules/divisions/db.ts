import { db } from '../../db/index.js'
import { divisions } from '../../db/schemas/divisions.js'
import { eq } from 'drizzle-orm'

export const getDivisionById = async(id: string) => {
  return db.select()
    .from(divisions)
    .where(eq(divisions.id, id))
}
