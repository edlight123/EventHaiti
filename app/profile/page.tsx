import { redirect } from 'next/navigation'

export default function ProfilePage() {
  // Redirect to the new profile page
  redirect('/me/profile')
}
