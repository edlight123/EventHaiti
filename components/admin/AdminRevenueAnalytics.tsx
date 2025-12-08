'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Smartphone,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface RevenueData {
  totalRevenueUSD: number
  totalRevenueHTG: number
  totalTickets: number
  byCurrency: {
    HTG: {
      revenue: number
      tickets: number
      averagePrice: number
      convertedToUSD: number
    }
    USD: {
      revenue: number
      tickets: number
      averagePrice: number
    }
  }
  byPaymentMethod: {
    stripe: {
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    moncash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    natcash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
  }
  exchangeRates: {
    averageRate: number
    minRate: number
    maxRate: number
    rateSpread: number
  }
}

interface GrowthData {
  revenueGrowth7d: number
  ticketsGrowth7d: number
  revenueGrowth30d: number
  ticketsGrowth30d: number
}

export function AdminRevenueAnalytics() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [growth, setGrowth] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue-analytics?type=platform')
      .then(res => res.json())
      .then(data => {
        setRevenue(data.revenue)
        setGrowth(data.growth)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load revenue analytics:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!revenue) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load revenue analytics
      </div>
    )
  }

  const GrowthBadge = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-gray-500 text-sm">No change</span>
    const isPositive = value > 0
    return (
      <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Total Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            {growth && <GrowthBadge value={growth.revenueGrowth7d} />}
          </div>
          <div className="text-sm font-medium text-teal-700 mb-1">Total Revenue (USD)</div>
          <div className="text-3xl font-bold text-teal-900">
            {formatCurrency(revenue.totalRevenueUSD, 'USD')}
          </div>
          {growth && (
            <div className="text-xs text-teal-600 mt-2">
              7-day growth: <GrowthBadge value={growth.revenueGrowth7d} />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            {growth && <GrowthBadge value={growth.ticketsGrowth7d} />}
          </div>
          <div className="text-sm font-medium text-blue-700 mb-1">Total Tickets Sold</div>
          <div className="text-3xl font-bold text-blue-900">
            {revenue.totalTickets.toLocaleString()}
          </div>
          {growth && (
            <div className="text-xs text-blue-600 mt-2">
              7-day growth: <GrowthBadge value={growth.ticketsGrowth7d} />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-sm font-medium text-purple-700 mb-1">Average Ticket Price</div>
          <div className="text-3xl font-bold text-purple-900">
            {formatCurrency(revenue.totalRevenueUSD / revenue.totalTickets || 0, 'USD')}
          </div>
          <div className="text-xs text-purple-600 mt-2">
            Across all currencies
          </div>
        </div>
      </div>

      {/* Currency Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Currency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HTG Revenue */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">HTG (Haitian Gourde)</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {revenue.byCurrency.HTG.tickets} tickets
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenue.byCurrency.HTG.revenue, 'HTG')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Converted to USD</div>
                <div className="text-xl font-semibold text-teal-600">
                  {formatCurrency(revenue.byCurrency.HTG.convertedToUSD, 'USD')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Average Price</div>
                <div className="text-lg font-medium text-gray-700">
                  {formatCurrency(revenue.byCurrency.HTG.averagePrice, 'HTG')}
                </div>
              </div>
            </div>
          </div>

          {/* USD Revenue */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">USD (US Dollar)</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {revenue.byCurrency.USD.tickets} tickets
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(revenue.byCurrency.USD.revenue, 'USD')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Average Price</div>
                <div className="text-lg font-medium text-gray-700">
                  {formatCurrency(revenue.byCurrency.USD.averagePrice, 'USD')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Payment Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stripe */}
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium text-indigo-900">Stripe</h4>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-indigo-600">Revenue (USD)</div>
                <div className="text-xl font-bold text-indigo-900">
                  {formatCurrency(revenue.byPaymentMethod.stripe.revenueUSD, 'USD')}
                </div>
              </div>
              <div className="text-xs text-indigo-600">
                {revenue.byPaymentMethod.stripe.tickets} tickets • Avg: {formatCurrency(revenue.byPaymentMethod.stripe.averagePrice, 'USD')}
              </div>
            </div>
          </div>

          {/* MonCash */}
          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-orange-600" />
              <h4 className="font-medium text-orange-900">MonCash</h4>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-orange-600">Revenue (HTG)</div>
                <div className="text-xl font-bold text-orange-900">
                  {formatCurrency(revenue.byPaymentMethod.moncash.revenueHTG, 'HTG')}
                </div>
              </div>
              <div className="text-xs text-orange-600">
                USD: {formatCurrency(revenue.byPaymentMethod.moncash.revenueUSD, 'USD')}
              </div>
              <div className="text-xs text-orange-600">
                {revenue.byPaymentMethod.moncash.tickets} tickets
              </div>
            </div>
          </div>

          {/* NatCash */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">NatCash</h4>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-green-600">Revenue (HTG)</div>
                <div className="text-xl font-bold text-green-900">
                  {formatCurrency(revenue.byPaymentMethod.natcash.revenueHTG, 'HTG')}
                </div>
              </div>
              <div className="text-xs text-green-600">
                USD: {formatCurrency(revenue.byPaymentMethod.natcash.revenueUSD, 'USD')}
              </div>
              <div className="text-xs text-green-600">
                {revenue.byPaymentMethod.natcash.tickets} tickets
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Rate Info */}
      {revenue.exchangeRates.averageRate > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Rate Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Average Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {revenue.exchangeRates.averageRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Min Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {revenue.exchangeRates.minRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Max Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {revenue.exchangeRates.maxRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Rate Spread</div>
              <div className="text-lg font-semibold text-gray-900">
                {revenue.exchangeRates.rateSpread.toFixed(6)}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            HTG to USD conversion rates across all transactions
          </p>
        </div>
      )}
    </div>
  )
}
