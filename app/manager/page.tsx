'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ManagerPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('active')
  const [darkMode, setDarkMode] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      setCurrentUser(data)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fetchData = async () => {
    const { data: shipmentsData } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: specialistsData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'ops_specialist')

    setShipments(shipmentsData || [])
    setSpecialists(specialistsData || [])
    setLoading(false)
  }

  const assignSpecialist = async (shipmentId: string, specialistId: string) => {
    await supabase
      .from('shipments')
      .update({ assigned_specialist: specialistId })
      .eq('id', shipmentId)
    fetchData()
  }

  const updateStatus = async (shipmentId: string, status: string) => {
    await supabase
      .from('shipments')
      .update({ status })
      .eq('id', shipmentId)
    fetchData()
  }

  const statusLabels: any = {
    heading_to_tas: 'Heading to TAS',
    at_airport: 'At Airport',
    departed: 'Departed',
    arrived_destination: 'Arrived at Destination',
    completed: 'Completed',
    postponed: 'Postponed'
  }

  const statusColors: any = {
    heading_to_tas: 'bg-green-100 text-green-800',
    at_airport: 'bg-indigo-100 text-indigo-800',
    departed: 'bg-cyan-100 text-cyan-800',
    arrived_destination: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-gray-100 text-gray-800',
    postponed: 'bg-red-100 text-red-800'
  }

  const opsStatuses = ['heading_to_tas', 'at_airport', 'departed', 'arrived_destination', 'completed', 'postponed']
  const activeShipments = shipments.filter(s => opsStatuses.includes(s.status) && s.status !== 'completed')
  const completedShipments = shipments.filter(s => s.status === 'completed')

  const menuItems = [
    { id: 'active', label: 'Active Shipments', icon: '📦' },
    { id: 'completed', label: 'Completed Shipments', icon: '✅' },
    { id: 'trucks', label: 'Trucks', icon: '🚛' },
    { id: 'guide', label: 'User Guide', icon: '📖' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
  ]

  const renderTable = (data: any[], showStatusDropdown: boolean) => (
    <div className={`rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
      <table className="w-full">
        <thead className={`border-b ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <tr>
            {['Tracking No.', 'Client', 'Route', 'Weight', 'Departure', 'Team', 'FWB', 'Specialist', 'Status'].map(h => (
              <th key={h} className={`text-left px-6 py-3 text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
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
              <tr key={s.id} onClick={() => router.push(`/shipment/${s.id}`)} className={`cursor-pointer ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.tracking_number}</td>
                <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{s.client_name}</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.origin} → {s.destination}</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.weight_kg} kg</td>
                <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.estimated_departure}</td>
                <td className={`px-6 py-4 text-sm font-medium ${s.team === 'BEY Team' ? 'text-blue-500' : s.team === 'KUL Team' ? 'text-green-500' : 'text-gray-400'}`}>
                  {s.team || '—'}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.fwb_status === 'sent' ? 'bg-green-100 text-green-800' :
                    s.fwb_status === 'not_sent' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {s.fwb_status === 'sent' ? 'Sent' : s.fwb_status === 'not_sent' ? 'Not Sent' : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  {showStatusDropdown ? (
                    <select
                      value={s.assigned_specialist || ''}
                      onChange={(e) => assignSpecialist(s.id, e.target.value)}
                      className={`text-sm border rounded-lg px-2 py-1 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-200 text-gray-700'}`}
                    >
                      <option value="">Not assigned</option>
                      {specialists.map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      {specialists.find(sp => sp.id === s.assigned_specialist)?.full_name || '—'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  {showStatusDropdown ? (
                    <select
                      value={s.status}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                      className={`text-sm border rounded-lg px-2 py-1 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label as string}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[s.status]}`}>
                      {statusLabels[s.status]}
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
                  { label: 'In Progress', value: activeShipments.filter(s => ['at_airport', 'departed'].includes(s.status)).length, color: 'text-orange-500' },
                  { label: 'Pending', value: activeShipments.filter(s => s.status === 'heading_to_tas').length, color: 'text-yellow-500' },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl p-5 shadow-sm ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Active Shipments</h2>
              {renderTable(activeShipments, true)}
            </>
          )}

          {activeSection === 'completed' && (
            <>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Completed Shipments</h2>
              {renderTable(completedShipments, false)}
            </>
          )}

          {activeSection === 'trucks' && (
            <div className={`rounded-xl shadow-sm p-10 text-center ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <button
                onClick={() => router.push('/trucks')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg"
              >
                🚛 Open Trucks Module
              </button>
            </div>
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
    </div>
  )
}