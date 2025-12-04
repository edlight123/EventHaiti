'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateFavorites() {
  revalidatePath('/favorites')
}
