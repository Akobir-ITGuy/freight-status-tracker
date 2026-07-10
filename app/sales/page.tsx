'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SalesPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tracking_number: '',
    client_name: '',
    origin: '',
    destination: '',
    cargo_type: '',
    weight_kg: '',
    volume_m3: '',
    estimated_departure: '',
    estimated_arrival: '',
    notes: ''
  })

  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false })
    setShipments(data || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: userData } = await supabase
      .from('users')
      .select('team')
      .eq('id', user?.id)
      .single()

    const { error } = await supabase.from('shipments').insert({
      ...form,
      weight_kg: parseFloat(form.weight_kg),
      volume_m3: parseFloat(form.volume_m3),
      status: 'pending',
      created_by: user?.id,
      team: userData?.team
    })

    if (!error) {
      setShowForm(false)
      setForm({
        tracking_number: '',
        client_name: '',
        origin: '',
        destination: '',
        cargo_type: '',
        weight_kg: '',
        volume_m3: '',
        estimated_departure: '',
        estimated_arrival: '',
        notes: ''
      })
      fetchShipments()
    }
  }

  const statusLabels: any = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    truck_arrived: 'Truck arrived',
    in_progress: 'In progress',
    at_airport: 'At airport',
    departed: 'Departed',
    arrived_destination: 'Arrived at destination',
    completed: 'Completed',
    postponed: 'Postponed'
  }

  const statusColors: any = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    truck_arrived: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-orange-100 text-orange-800',
    at_airport: 'bg-indigo-100 text-indigo-800',
    departed: 'bg-cyan-100 text-cyan-800',
    arrived_destination: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    postponed: 'bg-red-100 text-red-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Шапка */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">OPS Logistics — Sales</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          + New AWB
        </button>
      </div>

      {/* Список накладных */}
      <div className="p-8">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : shipments.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No AWBs yet</p>
            <p className="text-gray-400">Click "+ New AWB" to create the first one</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shipments.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-gray-900">{s.tracking_number}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[s.status]}`}>
                      {statusLabels[s.status]}
                    </span>
                  </div>
                  <p className="text-gray-600">{s.client_name}</p>
                  <p className="text-gray-400 text-sm">{s.origin} → {s.destination}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{s.weight_kg} kg</p>
                  <p>{s.volume_m3} m³</p>
                  <p className="mt-1">{s.estimated_departure}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Форма создания накладной */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New AWB</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tracking Number</label>
                <input
                  value={form.tracking_number}
                  onChange={(e) => setForm({...form, tracking_number: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="AWB-12345"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer</label>
                <input
                  value={form.client_name}
                  onChange={(e) => setForm({...form, client_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Origin</label>
                <input
                  value={form.origin}
                  onChange={(e) => setForm({...form, origin: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Shanghai"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Destination</label>
                <input
                  value={form.destination}
                  onChange={(e) => setForm({...form, destination: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Tashkent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cargo Type</label>
                <input
                  value={form.cargo_type}
                  onChange={(e) => setForm({...form, cargo_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Electronics, clothing..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => setForm({...form, weight_kg: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Volume (m³)</label>
                <input
                  type="number"
                  value={form.volume_m3}
                  onChange={(e) => setForm({...form, volume_m3: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="2.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Flight Date</label>
                <input
                  type="date"
                  value={form.estimated_departure}
                  onChange={(e) => setForm({...form, estimated_departure: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Arrival Date</label>
                <input
                  type="date"
                  value={form.estimated_arrival}
                  onChange={(e) => setForm({...form, estimated_arrival: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Additional information..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Create AWB
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}