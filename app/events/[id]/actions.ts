'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateEvent(id: string) {
  revalidatePath(`/events/${id}`)
}
