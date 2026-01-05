'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function SeedEventsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    events?: Array<{ id: string; title: string; location: string; date: string; price: string; currency: string }>
  } | null>(null)

  const handleSeedEvents = async () => {
    if (!confirm('This will create 30 template events. Continue?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/seed-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed events')
      }

      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to seed events',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Seed Template Events</CardTitle>
          <CardDescription>
            Create 30 template events across Haiti, USA, and Canada under the info@edlight.org organizer account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">What will be created:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>15 events in Haiti (50%) - Mix of USD and HTG pricing</li>
              <li>8 events in USA (Miami, New York, Boston, etc.)</li>
              <li>7 events in Canada (Montreal, Toronto, Vancouver, etc.)</li>
              <li>Categories: Music, Festival, Cultural, Food, Art, Conference, Workshop</li>
              <li>Multiple ticket tiers: Early Bird (30% off, expires 14 days before), General, VIP</li>
              <li>Haiti events: HTG 1,000-4,500 or USD $20-$100</li>
              <li>Event dates: 30-90 days in the future</li>
            </ul>
          </div>

          <Button
            onClick={handleSeedEvents}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Events...
              </>
            ) : (
              'Create 30 Template Events'
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-semibold mb-2">{result.message}</p>
                {result.events && result.events.length > 0 && (
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    <p className="text-sm mb-2">Created events:</p>
                    <div className="space-y-2">
                      {result.events.map((event, idx) => (
                        <div
                          key={event.id}
                          className="text-xs bg-background/50 p-2 rounded border"
                        >
                          <div className="font-medium">{idx + 1}. {event.title}</div>
                          <div className="text-muted-foreground">
                            {event.location} • {new Date(event.date).toLocaleDateString()} • {event.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result?.success && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = '/discover'}
              >
                View Events
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = '/organizer/events'}
              >
                Manage Events
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
