import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    // Upsert user preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        marketing_emails: preferences.marketingEmails ?? true,
        event_reminders: preferences.eventReminders ?? true,
        whatsapp_notifications: preferences.whatsappNotifications ?? true,
        data_processing_consent: preferences.dataProcessingConsent ?? false,
        terms_accepted_at: preferences.termsAccepted ? new Date().toISOString() : null,
        privacy_policy_accepted_at: preferences.privacyAccepted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, preferences: data })
  } catch (error) {
    console.error('Preferences update error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!preferences) {
      // Return default preferences
      return Response.json({
        marketingEmails: true,
        eventReminders: true,
        whatsappNotifications: true,
        dataProcessingConsent: false,
        termsAcceptedAt: null,
        privacyPolicyAcceptedAt: null
      })
    }

    return Response.json({
      marketingEmails: preferences.marketing_emails,
      eventReminders: preferences.event_reminders,
      whatsappNotifications: preferences.whatsapp_notifications,
      dataProcessingConsent: preferences.data_processing_consent,
      termsAcceptedAt: preferences.terms_accepted_at,
      privacyPolicyAcceptedAt: preferences.privacy_policy_accepted_at
    })
  } catch (error) {
    console.error('Preferences fetch error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
