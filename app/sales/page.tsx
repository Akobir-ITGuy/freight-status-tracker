'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TrucksSection from '../components/TrucksSection'

export default function SalesPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true'
    }
    return true
  })
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [specialists, setSpecialists] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState('active')
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
    flight_number: '',
    pcs: '',
    notes: ''
  })

  useEffect(() => {
    fetchShipments()
    fetchCurrentUser()
    fetchSpecialists()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('full_name, role, team')
        .eq('id', user.id)
        .single()
      setCurrentUser(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fetchShipments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false })
    setShipments(data || [])
    setLoading(false)
  }

  const fetchSpecialists = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'ops_specialist')
    setSpecialists(data || [])
  }

  const handleSubmit = async () => {
    if (!form.tracking_number || !form.client_name || !form.origin || !form.destination || !form.cargo_type) {
      alert('Please fill in all required fields: AWB, Client, Hub, Destination, Commodity')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users')
      .select('team')
      .eq('id', user?.id)
      .single()

    const { error } = await supabase.from('shipments').insert({
      tracking_number: form.tracking_number,
      client_name: form.client_name,
      origin: form.origin,
      destination: form.destination,
      cargo_type: form.cargo_type,
      weight_kg: parseFloat(form.weight_kg) || 0,
      volume_m3: parseFloat(form.volume_m3) || 0,
      pcs: form.pcs ? parseInt(form.pcs) : null,
      estimated_departure: form.estimated_departure || null,
      estimated_arrival: null,
      flight_number: form.flight_number || null,
      notes: form.notes || null,
      status: 'shipment_confirmed',
      fwb_status: 'na',
      created_by: user?.id,
      team: userData?.team
    })

    if (error) {
      console.error('Error creating shipment:', error)
      return
    }

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
        flight_number: '',
        pcs: '',
        notes: ''
      })
      fetchShipments()
    }
  }

  const updateStatus = async (shipmentId: string, status: string) => {
    await supabase
      .from('shipments')
      .update({ status })
      .eq('id', shipmentId)
    fetchShipments()
  }

  const updateFwb = async (shipmentId: string, fwbStatus: string) => {
    await supabase
      .from('shipments')
      .update({ fwb_status: fwbStatus })
      .eq('id', shipmentId)
    fetchShipments()
  }

  const statusLabels: any = {
    shipment_confirmed: 'Shipment Confirmed',
    arrived_at_wh: 'Arrived at W/H',
    departed_from_wh: 'Departed from W/H',
    under_customs: 'Under Customs Formalities',
    arrived_cn_kz: 'Arrived at CN/KZ Border',
    arrived_kz_uz: 'Arrived at KZ/UZ Border',
    heading_to_tas: 'Heading to TAS',
  }

  const salesStatuses = [
    'shipment_confirmed',
    'arrived_at_wh',
    'departed_from_wh',
    'under_customs',
    'arrived_cn_kz',
    'arrived_kz_uz',
    'heading_to_tas'
  ]

  const activeShipments = shipments.filter(s => s.status !== 'completed')
  const completedShipments = shipments.filter(s => s.status === 'completed')

  const menuItems = [
    { id: 'active', label: 'Active Shipments', icon: '📦' },
    { id: 'completed', label: 'Completed Shipments', icon: '✅' },
    { id: 'trucks', label: 'Trucks', icon: '🚛' },
    { id: 'guide', label: 'User Guide', icon: '📖' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
  ]

  const renderTable = (data: any[]) => (
    <div className={`rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
      <table className="w-full">
        <thead className={`border-b ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <tr>
            {['AWB', 'DEST', 'STD', 'Flight', 'Pcs', 'GW', 'Status', 'FWB', 'Handler', 'Notes'].map(h => (
              <th key={h} className={`text-left px-6 py-3 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-100'}`}>
          {loading ? (
            <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={9} className="text-center py-10 text-gray-400">No AWBs yet</td></tr>
          ) : (
            data.map((s) => (
              <tr key={s.id} className={darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}>
                <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.tracking_number}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.destination}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {s.estimated_departure ? new Date(s.estimated_departure).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.flight_number || '—'}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.pcs || '—'}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.weight_kg} kg</td>
                <td className="px-6 py-4">
                  <select
                    value={s.fwb_status || 'na'}
                    onChange={(e) => updateFwb(s.id, e.target.value)}
                    className={`text-sm border rounded-lg px-2 py-1 font-medium ${
                      s.fwb_status === 'sent' ? 'bg-green-100 text-green-800 border-green-200' :
                      s.fwb_status === 'not_sent' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="na">N/A</option>
                    <option value="not_sent">Not Sent</option>
                    <option value="sent">Sent</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  {activeSection === 'active' ? (
                    <select
                      value={s.status}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                      className={`text-sm border rounded-lg px-2 py-1 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                    >
                      {salesStatuses.map(status => (
                        <option key={status} value={status}>{statusLabels[status]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-800">
                      {statusLabels[s.status] || s.status}
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {specialists.find(sp => sp.id === s.assigned_specialist)?.full_name || '—'}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {s.notes ? s.notes.substring(0, 30) + (s.notes.length > 30 ? '...' : '') : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className={`border-b px-8 py-4 flex items-center justify-between ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col gap-1 p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <span className={`w-5 h-0.5 block ${darkMode ? 'bg-gray-300' : 'bg-gray-700'}`}></span>
            <span className={`w-5 h-0.5 block ${darkMode ? 'bg-gray-300' : 'bg-gray-700'}`}></span>
            <span className={`w-5 h-0.5 block ${darkMode ? 'bg-gray-300' : 'bg-gray-700'}`}></span>
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Freight Status Tracker
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {currentUser && (
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              👤 {currentUser.full_name}
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            + New AWB
          </button>
          <button
            onClick={() => {
              const newMode = !darkMode
              setDarkMode(newMode)
              localStorage.setItem('darkMode', String(newMode))
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="flex">
        {menuOpen && (
          <div className={`w-64 min-h-screen border-r shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}>
            <nav className="p-4 flex flex-col gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setMenuOpen(false) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="flex-1 p-8">
          {activeSection === 'active' && (
            <>
              {/* Stats */}
              <div className={`rounded-xl p-5 shadow-sm mb-4 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-3">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current Shipments</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activeShipments.length}</p>
                </div>

                {/* Progress Bar */}
                {activeShipments.length > 0 && (
                  <div className="w-full h-3 rounded-full overflow-hidden flex mb-4">
                    {[
                      { statuses: ['shipment_confirmed', 'arrived_at_wh', 'departed_from_wh'], color: 'bg-yellow-400' },
                      { statuses: ['under_customs', 'arrived_cn_kz'], color: 'bg-orange-400' },
                      { statuses: ['arrived_kz_uz', 'heading_to_tas'], color: 'bg-red-400' },
                      { statuses: ['at_airport', 'departed', 'arrived_destination'], color: 'bg-green-400' },
                    ].map((segment, i) => {
                      const count = activeShipments.filter(s => segment.statuses.includes(s.status)).length
                      const width = (count / activeShipments.length) * 100
                      return width > 0 ? (
                        <div
                          key={i}
                          className={`${segment.color} h-full transition-all`}
                          style={{ width: `${width}%` }}
                        />
                      ) : null
                    })}
                  </div>
                )}

                {/* Stage counts */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'LTL Consoling', statuses: ['shipment_confirmed', 'arrived_at_wh', 'departed_from_wh'], color: 'text-yellow-500', bg: darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50', border: 'border-yellow-400' },
                    { label: 'En Route to KZ', statuses: ['under_customs', 'arrived_cn_kz'], color: 'text-orange-500', bg: darkMode ? 'bg-orange-900/30' : 'bg-orange-50', border: 'border-orange-400' },
                    { label: 'Customs Clearance', statuses: ['arrived_kz_uz', 'heading_to_tas'], color: 'text-red-500', bg: darkMode ? 'bg-red-900/30' : 'bg-red-50', border: 'border-red-400' },
                    { label: 'En Route to UZ', statuses: ['at_airport', 'departed', 'arrived_destination'], color: 'text-green-500', bg: darkMode ? 'bg-green-900/30' : 'bg-green-50', border: 'border-green-400' },
                  ].map((stage) => {
                    const count = activeShipments.filter(s => stage.statuses.includes(s.status)).length
                    return (
                      <div key={stage.label} className={`rounded-lg p-3 border-l-4 ${stage.bg} ${stage.border}`}>
                        <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stage.label}</p>
                        <p className={`text-2xl font-bold ${stage.color}`}>{count}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Active Shipments</h2>
              {renderTable(activeShipments)}
            </>
          )}

          {activeSection === 'completed' && (
            <>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Completed Shipments</h2>
              {renderTable(completedShipments)}
            </>
          )}

          {activeSection === 'trucks' && (
            <TrucksSection darkMode={darkMode} currentUser={currentUser} />
          )}

          {activeSection === 'guide' && (
            <div className={`rounded-xl shadow-sm p-10 text-center ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <p className="text-4xl mb-4">📖</p>
              <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Guide</h2>
              <p className="text-gray-400">Coming soon...</p>
            </div>
          )}

          {activeSection === 'feedback' && (
            <div className={`rounded-xl shadow-sm p-10 text-center ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <p className="text-4xl mb-4">💬</p>
              <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Feedback</h2>
              <p className="text-gray-400">Coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>New AWB</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AWB</label>
                  <input
                    type="text"
                    value={form.tracking_number}
                    onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                    placeholder="AWB-12345"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Client</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="Company name"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hub</label>
                  <select
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}
                  >
                    <option value="">Select hub...</option>
                    <option value="XIY">XIY</option>
                    <option value="PVG">PVG</option>
                    <option value="SZX">SZX</option>
                    <option value="Pick Up">Pick Up</option>
                  </select>
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Destination</label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="Tashkent"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Commodity</label>
                  <input
                    type="text"
                    value={form.cargo_type}
                    onChange={(e) => setForm({ ...form, cargo_type: e.target.value })}
                    placeholder="Electronics"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pcs</label>
                  <input
                    type="number"
                    value={form.pcs}
                    onChange={(e) => setForm({ ...form, pcs: e.target.value })}
                    placeholder="10"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>GW (kg)</label>
                  <input
                    type="number"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                    placeholder="500"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Volume (m³)</label>
                  <input
                    type="number"
                    value={form.volume_m3}
                    onChange={(e) => setForm({ ...form, volume_m3: e.target.value })}
                    placeholder="2.5"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Flight Date</label>
                  <input
                    type="date"
                    value={form.estimated_departure}
                    onChange={(e) => setForm({ ...form, estimated_departure: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Flight No.</label>
                  <input
                    type="text"
                    value={form.flight_number}
                    onChange={(e) => setForm({ ...form, flight_number: e.target.value })}
                    placeholder="HY123"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
              <div className="col-span-2">
                <label className={`text-sm font-medium mb-1 block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                  rows={3}
                  placeholder="Additional information..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
                Create AWB
              </button>
              <button onClick={() => setShowForm(false)} className={`flex-1 font-semibold py-3 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}