'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import TrucksSection from '../components/TrucksSection'

export default function ManagerPage() {
  const [shipments, setShipments] = useState<any[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('active')
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true'
    }
    return true
  })
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
      .select('*, expenses(*)')
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

  const deleteShipment = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to delete this AWB?')) return
    await supabase.from('expenses').delete().eq('shipment_id', shipmentId)
    await supabase.from('documents').delete().eq('shipment_id', shipmentId)
    await supabase.from('shipment_logs').delete().eq('shipment_id', shipmentId)
    await supabase.from('shipment_statuses').delete().eq('shipment_id', shipmentId)
    await supabase.from('shipments').delete().eq('id', shipmentId)
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

  const [search, setSearch] = useState('')
  const opsStatuses = ['heading_to_tas', 'at_airport', 'departed', 'arrived_destination', 'completed', 'postponed']
  const activeShipments = shipments.filter(s => opsStatuses.includes(s.status) && s.status !== 'completed')
  const completedShipments = shipments.filter(s => s.status === 'completed')

  const filterShipments = (data: any[]) => {
    if (!search) return data
    return data.filter(s =>
      s.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.origin?.toLowerCase().includes(search.toLowerCase()) ||
      s.destination?.toLowerCase().includes(search.toLowerCase())
    )
  }

  const menuItems = [
    { id: 'active', label: 'Active Shipments', icon: '📦' },
    { id: 'completed', label: 'Completed Shipments', icon: '✅' },
    { id: 'trucks', label: 'Trucks', icon: '🚛' },
    { id: 'guide', label: 'User Guide', icon: '📖' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
  ]

  const renderTable = (data: any[], showStatusDropdown: boolean) => (
    <div className={`rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
      <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead className={`border-b ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <tr>
            {['AWB', 'DEST', 'STD', 'Flight', 'Pcs', 'GW', 'Status', 'FWB', 'Expenses', 'Handler', 'Notes', ''].map(h => (
              <th key={h} className={`text-left px-6 py-3 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-100'}`}>
          {loading ? (
            <tr><td colSpan={12} className="text-center py-10 text-gray-400">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={12} className="text-center py-10 text-gray-400">No AWBs yet</td></tr>
          ) : (
            data.map((s) => (
              <tr key={s.id} onClick={() => router.push(`/shipment/${s.id}`)} className={`cursor-pointer ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                <td className={`px-6 py-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.tracking_number}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.destination}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {s.estimated_departure ? new Date(s.estimated_departure).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.flight_number || '—'}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.pcs || '—'}</td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.weight_kg} kg</td>
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
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.fwb_status === 'sent' ? 'bg-green-100 text-green-800' :
                    s.fwb_status === 'not_sent' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {s.fwb_status === 'sent' ? 'Sent' : s.fwb_status === 'not_sent' ? 'Not Sent' : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-orange-600" onClick={(e) => e.stopPropagation()}>
                  {s.expenses?.length > 0
                    ? s.expenses.reduce((sum: number, e: any) => sum + e.amount, 0).toLocaleString() + ' UZS'
                    : '—'}
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
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {specialists.find(sp => sp.id === s.assigned_specialist)?.full_name || '—'}
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`} onClick={(e) => e.stopPropagation()}>
                  {s.notes ? s.notes.substring(0, 30) + (s.notes.length > 30 ? '...' : '') : '—'}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => deleteShipment(s.id)}
                    className="text-red-500 hover:text-red-600 text-sm font-medium"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
                </table>
          </div>
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
                      const width = activeShipments.length > 0 ? (count / activeShipments.length) * 100 : 0
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
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Active Shipments</h2>
                <input
                  type="text"
                  placeholder="Search by AWB, client, route..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                />
              </div>
              {renderTable(filterShipments(activeShipments), true)}
            </>
          )}

          {activeSection === 'completed' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Completed Shipments</h2>
                <input
                  type="text"
                  placeholder="Search by AWB, client, route..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`border rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                />
              </div>
              {renderTable(filterShipments(completedShipments), false)}
            </>
          )}

          {activeSection === 'trucks' && (
            <TrucksSection darkMode={darkMode} currentUser={currentUser} />
          )}

          {activeSection === 'guide' && (
            <div className={`rounded-xl shadow-sm p-10 text-center max-w-lg mx-auto ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <p className="text-5xl mb-4">📖</p>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Guide</h2>
              <div className={`rounded-lg p-4 mb-4 ${darkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className="text-yellow-600 text-sm font-medium">⚠️ Beta Version</p>
              </div>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                This is a Test Product and has not been officially released yet. If you have access to it, please refer to <span className="font-semibold">Akobir</span> regarding the usage of this application.
              </p>
            </div>
          )}

          {activeSection === 'feedback' && (
            <div className={`rounded-xl shadow-sm p-10 text-center max-w-lg mx-auto ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <p className="text-5xl mb-4">💬</p>
              <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Feedback</h2>
              <p className={`text-sm leading-relaxed mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Should you have any questions or feedback, please reach out to:
              </p>
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Akobir Yuldashev</p>
                <button
                  onClick={() => window.location.href = 'mailto:ayuldashev@gmail.com'}
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  ayuldashev@gmail.com
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}