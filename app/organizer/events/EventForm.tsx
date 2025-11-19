'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { isDemoMode } from '@/lib/demo'
import ImageUpload from '@/components/ImageUpload'

interface EventFormProps {
  userId: string
  event?: any
}

const CATEGORIES = ['Concert', 'Party', 'Conference', 'Festival', 'Workshop', 'Sports', 'Theater', 'Other']
const CITIES = ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Les Cayes', 'Jacmel', 'Port-de-Paix', 'Jérémie', 'Saint-Marc']

export default function EventForm({ userId, event }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'Concert',
    venue_name: event?.venue_name || '',
    city: event?.city || 'Port-au-Prince',
    commune: event?.commune || '',
    address: event?.address || '',
    start_datetime: event?.start_datetime ? event.start_datetime.slice(0, 16) : '',
    end_datetime: event?.end_datetime ? event.end_datetime.slice(0, 16) : '',
    ticket_price: event?.ticket_price || '',
    total_tickets: event?.total_tickets || '',
    banner_image_url: event?.banner_image_url || '',
    is_published: event?.is_published || false,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // In demo mode, just show success message
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800)) // Simulate API call
        alert('✅ Demo: Event saved! In production, this would create/update a real event.')
        router.push('/organizer/events')
        router.refresh()
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
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        ticket_price: parseFloat(formData.ticket_price.toString()),
        total_tickets: parseInt(formData.total_tickets.toString()),
        banner_image_url: formData.banner_image_url || null,
        is_published: formData.is_published,
      }

      if (event?.id) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)

        if (updateError) throw updateError
        router.push(`/organizer/events/${event.id}`)
      } else {
        // Create new event
        const { data, error: insertError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single()

        if (insertError) throw insertError
        router.push(`/organizer/events/${data.id}`)
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            placeholder="e.g., Summer Music Festival 2025"
          />
        </div>

        {/* Banner Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Banner Image
          </label>
          <ImageUpload
            currentImage={formData.banner_image_url}
            onImageUploaded={(url) => setFormData(prev => ({ ...prev, banner_image_url: url }))}
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            placeholder="Describe your event..."
          />
        </div>

        {/* Venue Name */}
        <div>
          <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-2">
            Venue Name *
          </label>
          <input
            type="text"
            id="venue_name"
            name="venue_name"
            required
            value={formData.venue_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            placeholder="e.g., National Stadium"
          />
        </div>

        {/* Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <select
              id="city"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            >
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="commune" className="block text-sm font-medium text-gray-700 mb-2">
              Commune *
            </label>
            <input
              type="text"
              id="commune"
              name="commune"
              required
              value={formData.commune}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              placeholder="e.g., Pétion-Ville"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Full Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            placeholder="e.g., 123 Rue de la République"
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              id="start_datetime"
              name="start_datetime"
              required
              value={formData.start_datetime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700 mb-2">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              id="end_datetime"
              name="end_datetime"
              required
              value={formData.end_datetime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700 mb-2">
              Ticket Price (HTG) *
            </label>
            <input
              type="number"
              id="ticket_price"
              name="ticket_price"
              required
              min="0"
              step="0.01"
              value={formData.ticket_price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              placeholder="500"
            />
          </div>

          <div>
            <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-700 mb-2">
              Total Tickets *
            </label>
            <input
              type="number"
              id="total_tickets"
              name="total_tickets"
              required
              min="1"
              value={formData.total_tickets}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              placeholder="100"
            />
          </div>
        </div>

        {/* Banner Image URL */}
        <div>
          <label htmlFor="banner_image_url" className="block text-sm font-medium text-gray-700 mb-2">
            Banner Image URL (Optional)
          </label>
          <input
            type="url"
            id="banner_image_url"
            name="banner_image_url"
            value={formData.banner_image_url}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            placeholder="https://example.com/banner.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x630px</p>
        </div>

        {/* Publish Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_published"
            name="is_published"
            checked={formData.is_published}
            onChange={handleChange}
            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
          />
          <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
            Publish event (make it visible to the public)
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex items-center justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : event?.id ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  )
}
