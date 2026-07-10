'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SpecialistPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      fetchShipments(user.id)
    }
  }

  const fetchShipments = async (uid: string) => {
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .eq('assigned_specialist', uid)
      .order('created_at', { ascending: false })
    setShipments(data || [])
    setLoading(false)
  }

  const updateStatus = async (shipmentId: string, status: string) => {
    await supabase
      .from('shipments')
      .update({ status })
      .eq('id', shipmentId)
    fetchShipments(userId)
  }

  const statusLabels: any = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    truck_arrived: 'Truck Arrived',
    in_progress: 'In Progress',
    at_airport: 'At Airport',
    departed: 'Departed',
    arrived_destination: 'Arrived',
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

      {/* Header */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">OPS Logistics — Ops Specialist</h1>
        <div className="text-sm text-gray-500">My AWBs: {shipments.length}</div>
      </div>

      {/* Stats */}
      <div className="p-8 grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm">Total AWBs</p>
          <p className="text-3xl font-bold text-gray-900">{shipments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm">In Progress</p>
          <p className="text-3xl font-bold text-orange-500">
            {shipments.filter(s => ['in_progress', 'at_airport', 'truck_arrived'].includes(s.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-500">
            {shipments.filter(s => s.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* AWB List */}
      <div className="px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tracking No.</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Client</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Route</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Weight</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Departure</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">No AWBs assigned yet</td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.tracking_number}</td>
                    <td className="px-6 py-4 text-gray-600">{s.client_name}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{s.origin} → {s.destination}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{s.weight_kg} kg</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{s.estimated_departure}</td>
                    <td className="px-6 py-4">
                      <select
                        value={s.status}
                        onChange={(e) => updateStatus(s.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white"
                      >
                        {Object.entries(statusLabels)
                          .filter(([value]) => value !== 'completed')
                          .map(([value, label]) => (
                          <option key={value} value={value}>{label as string}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}