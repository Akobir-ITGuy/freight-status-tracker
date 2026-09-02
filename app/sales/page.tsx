'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SalesPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
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
    notes: ''
  })

  useEffect(() => {
    fetchShipments()
    fetchCurrentUser()
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
      status: 'shipment_confirmed',
      fwb_status: 'na',
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
    { id: 'guide', label: 'User Guide', icon: '📖' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
  ]

  const renderTable = (data: any[]) => (
    <div className={`rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
      <table className="w-full">
        <thead className={`border-b ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <tr>
            {['Tracking No.', 'Client', 'Route', 'Weight', 'Departure', 'FWB', 'Status'].map(h => (
              <th key={h} className={`text-left px-6 py-3 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-100'}`}>
          {loading ? (
            <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No AWBs yet</td></tr>
          ) : (
            data.map((s) => (
              <tr key={s.id} className={darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}>
                <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.tracking_number}</td>
                <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{s.client_name}</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.origin} → {s.destination}</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.weight_kg} kg</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.estimated_departure}</td>
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
            onClick={() => setDarkMode(!darkMode)}
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
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Active', value: activeShipments.length, color: darkMode ? 'text-white' : 'text-gray-900' },
                  { label: 'In Transit', value: activeShipments.filter(s => ['departed_from_wh', 'under_customs', 'arrived_cn_kz', 'arrived_kz_uz'].includes(s.status)).length, color: 'text-orange-500' },
                  { label: 'Heading to TAS', value: activeShipments.filter(s => s.status === 'heading_to_tas').length, color: 'text-green-500' },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl p-5 shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
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
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New AWB</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Tracking No.', key: 'tracking_number', placeholder: 'AWB-12345' },
                { label: 'Client', key: 'client_name', placeholder: 'Company name' },
                { label: 'Origin', key: 'origin', placeholder: 'Shanghai' },
                { label: 'Destination', key: 'destination', placeholder: 'Tashkent' },
                { label: 'Cargo Type', key: 'cargo_type', placeholder: 'Electronics' },
                { label: 'Weight (kg)', key: 'weight_kg', placeholder: '500', type: 'number' },
                { label: 'Volume (m³)', key: 'volume_m3', placeholder: '2.5', type: 'number' },
                { label: 'Est. Departure', key: 'estimated_departure', type: 'date' },
                { label: 'Est. Arrival', key: 'estimated_arrival', type: 'date' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional information..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
                Create AWB
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}