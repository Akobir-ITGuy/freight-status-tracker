'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [truckShipments, setTruckShipments] = useState<{[key: string]: any[]}>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('active')

  const [truckForm, setTruckForm] = useState({
    truck_number: '',
    truck_reference: '',
    departure_date: '',
    arrival_date: ''
  })

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchCurrentUser()
    fetchTrucks()
    fetchShipments()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      setCurrentUser({ ...data, id: user.id })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fetchTrucks = async () => {
    const { data } = await supabase
      .from('trucks')
      .select('*, truck_expenses(*)')
      .order('created_at', { ascending: false })
    setTrucks(data || [])

    // Fetch shipments for each truck
    if (data) {
      const truckShipmentsMap: {[key: string]: any[]} = {}
      for (const truck of data) {
        const { data: sData } = await supabase
          .from('shipments')
          .select('*')
          .eq('truck_id', truck.id)
        truckShipmentsMap[truck.id] = sData || []
      }
      setTruckShipments(truckShipmentsMap)
    }

    setLoading(false)
  }

  const fetchShipments = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .is('truck_id', null)
    setShipments(data || [])
  }

  const createTruck = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('trucks').insert({
      truck_number: truckForm.truck_number,
      truck_reference: truckForm.truck_reference,
      origin: 'China',
      destination: 'Tashkent',
      departure_date: truckForm.departure_date,
      arrival_date: truckForm.arrival_date,
      created_by: user?.id
    })
    if (!error) {
      setShowForm(false)
      setTruckForm({ truck_number: '', truck_reference: '', departure_date: '', arrival_date: '' })
      fetchTrucks()
    }
  }

  const addExpense = async () => {
    if (!selectedTruck) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('truck_expenses').insert({
      truck_id: selectedTruck.id,
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      currency: 'UZS',
      description: expenseForm.description,
      created_by: user?.id
    })
    setExpenseForm({ category: '', amount: '', description: '' })
    fetchTrucks()
  }

  const assignShipment = async (shipmentId: string, truckId: string) => {
    await supabase
      .from('shipments')
      .update({ truck_id: truckId })
      .eq('id', shipmentId)
    fetchShipments()
    fetchTrucks()
  }

  const removeShipment = async (shipmentId: string) => {
    await supabase
      .from('shipments')
      .update({ truck_id: null })
      .eq('id', shipmentId)
    fetchShipments()
    fetchTrucks()
  }

  const updateTruckStatus = async (truckId: string, status: string) => {
    await supabase
      .from('trucks')
      .update({ status })
      .eq('id', truckId)
    if (status === 'unloaded') {
      await distributeExpenses(truckId)
    }
    fetchTrucks()
  }

  const distributeExpenses = async (truckId: string) => {
    const { data: truckShipmentsList } = await supabase
      .from('shipments')
      .select('id, weight_kg')
      .eq('truck_id', truckId)

    const { data: expenses } = await supabase
      .from('truck_expenses')
      .select('amount')
      .eq('truck_id', truckId)

    if (!truckShipmentsList || !expenses) return

    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalWeight = truckShipmentsList.reduce((sum, s) => sum + s.weight_kg, 0)

    for (const shipment of truckShipmentsList) {
      const share = (shipment.weight_kg / totalWeight) * totalExpense
      await supabase.from('expenses').insert({
        shipment_id: shipment.id,
        category: 'Truck Expenses',
        amount: Math.round(share),
        currency: 'UZS',
        description: 'Auto-distributed from truck expenses',
        is_shared: true
      })
    }
  }

  const statusLabels: any = {
    loading: 'Loading',
    en_route: 'En Route',
    arrived: 'Arrived',
    unloaded: 'Unloaded'
  }

  const statusColors: any = {
    loading: 'bg-yellow-100 text-yellow-800',
    en_route: 'bg-blue-100 text-blue-800',
    arrived: 'bg-green-100 text-green-800',
    unloaded: 'bg-gray-100 text-gray-800'
  }

  const activeTrucks = trucks.filter(t => t.status !== 'unloaded')
  const archivedTrucks = trucks.filter(t => t.status === 'unloaded')
  const isManager = currentUser?.role === 'ops_manager'

  const menuItems = [
    { id: 'active', label: 'Active Trucks', icon: '🚛' },
    { id: 'archived', label: 'Archived Trucks', icon: '📦' },
  ]

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {/* Header */}
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
          <button
            onClick={() => window.location.href = '/manager'}
            className={`text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ← Back
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Freight Status Tracker — Trucks
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
            + New Truck
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
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <div className="flex flex-col gap-6">
              {(activeSection === 'active' ? activeTrucks : archivedTrucks).map((truck) => {
                const totalExpense = truck.truck_expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0
                const assignedShipments = truckShipments[truck.id] || []
                const totalWeight = assignedShipments.reduce((sum, s) => sum + s.weight_kg, 0)

                return (
                  <div key={truck.id} className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    {/* Truck Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            🚛 {truck.truck_number}
                          </h3>
                          {truck.truck_reference && (
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Ref: {truck.truck_reference}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[truck.status]}`}>
                            {statusLabels[truck.status]}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          China → Tashkent
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Departure: {truck.departure_date || '—'} | Arrival: {truck.arrival_date || '—'}
                        </p>
                        <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          Total Weight: {totalWeight.toLocaleString()} kg | AWBs: {assignedShipments.length}
                        </p>
                      </div>
                      {isManager && activeSection === 'active' && (
                        <div className="flex gap-2">
                          <select
                            value={truck.status}
                            onChange={(e) => updateTruckStatus(truck.id, e.target.value)}
                            className={`text-sm border rounded-lg px-2 py-1 ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-200 text-gray-700'}`}
                          >
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label as string}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => { setSelectedTruck(truck); setShowExpenseForm(true) }}
                            className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-sm font-medium px-3 py-1 rounded-lg"
                          >
                            + Expense
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned AWBs */}
                    {assignedShipments.length > 0 && (
                      <div className={`rounded-lg p-4 mb-4 ${darkMode ? 'bg-gray-600' : 'bg-blue-50'}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                          Assigned AWBs ({assignedShipments.length})
                        </p>
                        <div className="flex flex-col gap-2">
                          {assignedShipments.map((s) => (
                            <div key={s.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {s.tracking_number}
                                </span>
                                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {s.client_name} — {s.weight_kg} kg
                                </span>
                              </div>
                              {activeSection === 'active' && (
                                <button
                                  onClick={() => removeShipment(s.id)}
                                  className="text-red-500 hover:text-red-600 text-xs font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expenses */}
                    {truck.truck_expenses?.length > 0 && (
                      <div className={`rounded-lg p-4 mb-4 ${darkMode ? 'bg-gray-600' : 'bg-orange-50'}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-orange-700'}`}>
                          Expenses — Total: {totalExpense.toLocaleString()} UZS
                        </p>
                        <div className="flex flex-col gap-1">
                          {truck.truck_expenses.map((exp: any) => (
                            <div key={exp.id} className="flex justify-between text-sm">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                                {exp.category}{exp.description ? ` — ${exp.description}` : ''}
                              </span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {exp.amount.toLocaleString()} UZS
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assign Shipments */}
                    {activeSection === 'active' && (
                      <div>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Assign AWB to this truck:
                        </p>
                        <select
                          onChange={(e) => { if (e.target.value) assignShipment(e.target.value, truck.id) }}
                          className={`text-sm border rounded-lg px-3 py-2 w-full ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                          value=""
                        >
                          <option value="">Select AWB to assign...</option>
                          {shipments.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.tracking_number} — {s.client_name} ({s.weight_kg} kg)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}

              {(activeSection === 'active' ? activeTrucks : archivedTrucks).length === 0 && (
                <div className={`rounded-xl shadow-sm p-10 text-center ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <p className="text-4xl mb-2">🚛</p>
                  <p className="text-gray-400">No trucks yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Truck Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">New Truck</h2>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Plate Number', key: 'truck_number', placeholder: '01 A 123 BC' },
                { label: 'Reference Number', key: 'truck_reference', placeholder: 'REF-12345' },
                { label: 'Departure Date', key: 'departure_date', type: 'date' },
                { label: 'Arrival Date', key: 'arrival_date', type: 'date' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(truckForm as any)[key]}
                    onChange={(e) => setTruckForm({ ...truckForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createTruck} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
                Create Truck
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Form */}
      {showExpenseForm && selectedTruck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Add Expense</h2>
            <p className="text-gray-500 text-sm mb-6">Truck: {selectedTruck.truck_number}</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  <option value="Loader">Loader</option>
                  <option value="Driver">Driver</option>
                  <option value="Customs">Customs</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Parking">Parking</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (UZS)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="500000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optional)</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addExpense} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg">
                Add Expense
              </button>
              <button onClick={() => setShowExpenseForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}