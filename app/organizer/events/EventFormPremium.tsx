'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import { useToast } from '@/components/ui/Toast'
import { getEventCompletion, getPublishBlockingIssues, EventFormData, TicketTier } from '@/lib/event-validation'
import { EditEventHeader } from '@/components/organizer/event-edit/EditEventHeader'
import { StepperTabs } from '@/components/organizer/event-edit/StepperTabs'
import { EventLivePreview } from '@/components/organizer/event-edit/EventLivePreview'
import { BasicInfoTab } from './tabs/BasicInfoTab'
import { LocationTab } from './tabs/LocationTab'
import { ScheduleTab } from './tabs/ScheduleTab'
import { TicketsTab } from './tabs/TicketsTab'
import { DetailsTab } from './tabs/DetailsTab'

interface EventFormProps {
  userId: string
  event?: any
}

export default function EventFormPremium({ userId, event }: EventFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentTab, setCurrentTab] = useState('basic')
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([])

  const [formData, setFormData] = useState<EventFormData>({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'Concert',
    venue_name: event?.venue_name || '',
    city: event?.city || 'Port-au-Prince',
    commune: event?.commune || '',
    address: event?.address || '',
    start_datetime: event?.start_datetime ? event.start_datetime.slice(0, 16) : '',
    end_datetime: event?.end_datetime ? event.end_datetime.slice(0, 16) : '',
    ticket_price: event?.ticket_price?.toString() || '',
    total_tickets: event?.total_tickets?.toString() || '',
    currency: event?.currency || 'USD',
    banner_image_url: event?.banner_image_url || '',
    is_published: event?.is_published || false,
    is_online: event?.is_online || false,
    join_url: event?.join_url || '',
    tags: event?.tags || []
  })

  // Calculate validation and completion
  const completion = getEventCompletion(formData, ticketTiers)
  const blockingIssues = getPublishBlockingIssues(formData, ticketTiers)

  // Load ticket tiers for existing event
  useEffect(() => {
    const loadTicketTiers = async () => {
      if (!event?.id || isDemoMode()) return
      
      try {
        const tiersRef = collection(db, 'ticket_tiers')
        const q = query(tiersRef, where('event_id', '==', event.id))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          const formattedTiers: TicketTier[] = querySnapshot.docs.map((doc) => {
            const tier = doc.data()
            return {
              name: tier.name || '',
              price: tier.price?.toString() || '',
              quantity: tier.total_quantity?.toString() || '',
              description: tier.description || ''
            }
          })
          setTicketTiers(formattedTiers)
        }
      } catch (err) {
        console.error('Error loading ticket tiers:', err)
      }
    }
    
    loadTicketTiers()
  }, [event?.id])

  // Track unsaved changes
  useEffect(() => {
    if (!event) {
      // New event - any data means unsaved changes
      const hasData = !!(formData.title || formData.description || formData.venue_name)
      setHasUnsavedChanges(hasData)
    } else {
      // Existing event - check if form data differs from original
      const hasChanges = 
        formData.title !== (event.title || '') ||
        formData.description !== (event.description || '') ||
        formData.category !== (event.category || '') ||
        formData.is_published !== (event.is_published || false)
      setHasUnsavedChanges(hasChanges)
    }
  }, [formData, event])

  // Autosave draft (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || !event?.id || formData.is_published) return

    const timer = setTimeout(async () => {
      await handleSave(true) // silent autosave
    }, 5000) // 5 second debounce

    return () => clearTimeout(timer)
  }, [formData, hasUnsavedChanges, event?.id])

  const handleChange = useCallback((field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = async (silent = false) => {
    setIsSaving(true)

    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (!silent) {
          showToast({
            type: 'success',
            title: 'Changes saved',
            message: 'Your event has been updated',
            duration: 3000
          })
        }
        setHasUnsavedChanges(false)
        return
      }

      const eventData = {
        organizer_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue_name: formData.venue_name,
        city: formData.city,
        commune: formData.commune,
        address: formData.address,
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
        ticket_price: parseFloat(formData.ticket_price?.toString() || '0'),
        total_tickets: parseInt(formData.total_tickets?.toString() || '0'),
        currency: formData.currency,
        banner_image_url: formData.banner_image_url || null,
        is_published: formData.is_published,
        is_online: formData.is_online,
        join_url: formData.join_url || null,
        tags: formData.tags || [],
      }

      if (event?.id) {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)

        if (updateError) throw updateError
        
        // Save ticket tiers if any exist
        if (ticketTiers.length > 0) {
          // Delete existing tiers first
          await supabase
            .from('ticket_tiers')
            .delete()
            .eq('event_id', event.id)
          
          // Insert new tiers
          const tiersToInsert = ticketTiers.map((tier) => ({
            event_id: event.id,
            name: tier.name,
            price: parseFloat(tier.price?.toString() || '0'),
            total_quantity: parseInt(tier.quantity?.toString() || '0'),
            sold_quantity: 0,
            description: tier.description || null
          }))
          
          const { error: tiersError } = await supabase
            .from('ticket_tiers')
            .insert(tiersToInsert)
          
          if (tiersError) throw tiersError
        }
        
        if (!silent) {
          showToast({
            type: 'success',
            title: 'Changes saved',
            message: 'Your event has been updated',
            duration: 3000
          })
        }
        setHasUnsavedChanges(false)
      } else {
        // Creating new event
        const { data, error: insertError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single()

        if (insertError) throw insertError
        
        // Save ticket tiers if any exist
        if (ticketTiers.length > 0 && data) {
          const tiersToInsert = ticketTiers.map((tier) => ({
            event_id: data.id,
            name: tier.name,
            price: parseFloat(tier.price?.toString() || '0'),
            total_quantity: parseInt(tier.quantity?.toString() || '0'),
            sold_quantity: 0,
            description: tier.description || null
          }))
          
          const { error: tiersError } = await supabase
            .from('ticket_tiers')
            .insert(tiersToInsert)
          
          if (tiersError) console.error('Error saving tiers:', tiersError)
        }
        
        if (!silent) {
          showToast({
            type: 'success',
            title: 'Event created',
            message: 'Your event has been saved as draft',
            duration: 3000
          })
        }
        
        // Navigate to edit page for the new event
        router.push(`/organizer/events/${data.id}/edit`)
        router.refresh()
      }
    } catch (err: any) {
      if (!silent) {
        showToast({
          type: 'error',
          title: 'Failed to save',
          message: err.message || 'Please try again',
          duration: 5000
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!completion.canPublish) {
      showToast({
        type: 'error',
        title: 'Cannot publish yet',
        message: `Complete ${completion.blockingIssues.length} required items first`,
        duration: 5000
      })
      return
    }

    setIsSaving(true)

    try {
      const newPublishState = !formData.is_published

      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setFormData(prev => ({ ...prev, is_published: newPublishState }))
        showToast({
          type: 'success',
          title: newPublishState ? 'Event published!' : 'Event unpublished',
          message: newPublishState ? 'Your event is now live' : 'Event is now a draft',
          duration: 4000
        })
        return
      }

      const { error } = await supabase
        .from('events')
        .update({ is_published: newPublishState })
        .eq('id', event?.id)

      if (error) throw error

      setFormData(prev => ({ ...prev, is_published: newPublishState }))
      showToast({
        type: 'success',
        title: newPublishState ? 'Event published!' : 'Event unpublished',
        message: newPublishState ? 'Your event is now live and visible to attendees' : 'Event set back to draft',
        duration: 4000
      })
      router.refresh()
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to publish',
        message: err.message || 'Please try again',
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNavigateToTab = (tabId: string) => {
    setCurrentTab(tabId)
  }

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'basic':
        return <BasicInfoTab formData={formData} onChange={handleChange} validation={completion.tabs.find(t => t.id === 'basic')!} />
      case 'location':
        return <LocationTab formData={formData} onChange={handleChange} validation={completion.tabs.find(t => t.id === 'location')!} />
      case 'schedule':
        return <ScheduleTab formData={formData} onChange={handleChange} validation={completion.tabs.find(t => t.id === 'schedule')!} />
      case 'tickets':
        return <TicketsTab formData={formData} onChange={handleChange} tiers={ticketTiers} onTiersChange={setTicketTiers} validation={completion.tabs.find(t => t.id === 'tickets')!} />
      case 'details':
        return <DetailsTab formData={formData} onChange={handleChange} validation={completion.tabs.find(t => t.id === 'details')!} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <EditEventHeader
        eventId={event?.id}
        title={formData.title}
        isPublished={formData.is_published}
        completionPercentage={completion.percentage}
        missingItemsCount={completion.blockingIssues.length}
        canPublish={completion.canPublish}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={() => handleSave(false)}
        onPublish={handlePublish}
        isSaving={isSaving}
      />

      {/* Stepper Tabs */}
      <StepperTabs
        tabs={completion.tabs}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Content */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
              {renderCurrentTab()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {currentTab !== 'basic' && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = completion.tabs.findIndex(t => t.id === currentTab)
                      if (currentIndex > 0) {
                        setCurrentTab(completion.tabs[currentIndex - 1].id)
                      }
                    }}
                    className="px-6 py-2.5 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    ← Previous
                  </button>
                )}
                
                {currentTab !== 'details' && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = completion.tabs.findIndex(t => t.id === currentTab)
                      if (currentIndex < completion.tabs.length - 1) {
                        setCurrentTab(completion.tabs[currentIndex + 1].id)
                      }
                    }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
                  >
                    Next Step →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview (1/3) - Desktop Only */}
          <div className="hidden lg:block">
            <EventLivePreview data={formData} tiers={ticketTiers} />
          </div>
        </div>
      </div>
    </div>
  )
}
