'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function ShipmentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchShipment()
    fetchDocuments()
    fetchLogs()
    fetchCurrentUser()
    fetchExpenses()
  }, [id])

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

  const fetchShipment = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single()
    setShipment(data)
    setForm(data)
    setLoading(false)
  }

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('shipment_id', id)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
  }

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('shipment_logs')
      .select('*, users(full_name)')
      .eq('shipment_id', id)
      .order('created_at', { ascending: false })
    setLogs(data || [])
  }

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('shipment_id', id)
      .order('created_at', { ascending: false })
    setExpenses(data || [])
  }

  const addExpense = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({
      shipment_id: id,
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      currency: 'UZS',
      description: expenseForm.description,
      is_shared: false,
      created_by: user?.id
    })
    await addLog('Uploaded', 'Expense', '', `${expenseForm.category} — ${expenseForm.amount} UZS`)
    setExpenseForm({ category: '', amount: '', description: '' })
    setShowExpenseForm(false)
    fetchExpenses()
    fetchLogs()
  }

  const addLog = async (action: string, fieldName: string, oldValue: string, newValue: string) => {
    await supabase.from('shipment_logs').insert({
      shipment_id: id,
      user_id: currentUser?.id,
      action,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue
    })
  }

  const handleSave = async () => {
    const fields = [
      { key: 'client_name', label: 'Client' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'cargo_type', label: 'Cargo Type' },
      { key: 'weight_kg', label: 'Weight' },
      { key: 'volume_m3', label: 'Volume' },
      { key: 'estimated_departure', label: 'Est. Departure' },
      { key: 'estimated_arrival', label: 'Est. Arrival' },
      { key: 'notes', label: 'Notes' },
    ]

    for (const field of fields) {
      const oldVal = String(shipment[field.key] || '')
      const newVal = String(form[field.key] || '')
      if (oldVal !== newVal) {
        await addLog('Updated', field.label, oldVal, newVal)
      }
    }

    await supabase
      .from('shipments')
      .update({
        client_name: form.client_name,
        origin: form.origin,
        destination: form.destination,
        cargo_type: form.cargo_type,
        weight_kg: parseFloat(form.weight_kg),
        volume_m3: parseFloat(form.volume_m3),
        estimated_departure: form.estimated_departure,
        estimated_arrival: form.estimated_arrival,
        notes: form.notes
      })
      .eq('id', id)

    setEditing(false)
    fetchShipment()
    fetchLogs()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const fileName = `${id}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('Shipping-Docs')
      .upload(fileName, file)
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('Shipping-Docs')
        .getPublicUrl(fileName)
      await supabase.from('documents').insert({
        shipment_id: id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        uploaded_by: user?.id
      })
      await addLog('Uploaded', 'Document', '', file.name)
      fetchDocuments()
      fetchLogs()
    }
    setUploading(false)
  }

  const handleDelete = async (docId: string, filePath: string, fileName: string) => {
    await supabase.storage.from('Shipping-Docs').remove([filePath])
    await supabase.from('documents').delete().eq('id', docId)
    await addLog('Deleted', 'Document', fileName, '')
    fetchDocuments()
    fetchLogs()
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (!shipment) return <div className="p-8 text-gray-500">Shipment not found</div>

  const statusLabels: any = {
    shipment_confirmed: 'Shipment Confirmed',
    arrived_at_wh: 'Arrived at W/H',
    departed_from_wh: 'Departed from W/H',
    under_customs: 'Under Customs Formalities',
    arrived_cn_kz: 'Arrived at CN/KZ Border',
    arrived_kz_uz: 'Arrived at KZ/UZ Border',
    heading_to_tas: 'Heading to TAS',
    at_airport: 'At Airport',
    departed: 'Departed',
    arrived_destination: 'Arrived at Destination',
    completed: 'Completed',
    postponed: 'Postponed'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            AWB: {shipment.tracking_number}
          </h1>
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
            {statusLabels[shipment.status]}
          </span>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editing
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {editing ? 'Save Changes' : 'Edit'}
        </button>
      </div>

      <div className="p-8 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          {/* Shipment Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Client', key: 'client_name' },
                { label: 'Origin', key: 'origin' },
                { label: 'Destination', key: 'destination' },
                { label: 'Cargo Type', key: 'cargo_type' },
                { label: 'Weight (kg)', key: 'weight_kg', type: 'number' },
                { label: 'Volume (m³)', key: 'volume_m3', type: 'number' },
                { label: 'Est. Departure', key: 'estimated_departure', type: 'date' },
                { label: 'Est. Arrival', key: 'estimated_arrival', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <p className="text-sm text-gray-500">{label}</p>
                  {editing ? (
                    <input
                      type={type || 'text'}
                      value={form[key] || ''}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{shipment[key]}</p>
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Team</p>
                <p className="font-medium text-gray-900">{shipment.team || '—'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Notes</p>
              {editing ? (
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700 mt-1">{shipment.notes || '—'}</p>
              )}
            </div>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Expenses
                {expenses.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    Total: {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} UZS
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-sm font-medium px-3 py-1 rounded-lg"
              >
                + Add Expense
              </button>
            </div>

            {showExpenseForm && (
              <div className="bg-orange-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="Customs">Customs</option>
                      <option value="Storage">Storage</option>
                      <option value="Handling">Handling</option>
                      <option value="Transport">Transport</option>
                      <option value="Insurance">Insurance</option>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    placeholder="Additional details..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addExpense}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg text-sm"
                  >
                    Save Expense
                  </button>
                  <button
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {expenses.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-2xl mb-1">💰</p>
                <p className="text-sm">No expenses yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{exp.category}</p>
                      {exp.description && <p className="text-xs text-gray-500">{exp.description}</p>}
                      {exp.is_shared && <p className="text-xs text-blue-500">Auto-distributed from truck</p>}
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {exp.amount.toLocaleString()} UZS
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
            {logs.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        <span className="font-medium">{log.users?.full_name || 'Unknown'}</span>
                        {' '}{log.action === 'Updated' ? 'updated' : log.action === 'Uploaded' ? 'uploaded' : 'deleted'}{' '}
                        <span className="font-medium">{log.field_name}</span>
                        {log.old_value && log.new_value && (
                          <span className="text-gray-500"> from <span className="line-through">{log.old_value}</span> to <span className="text-green-600">{log.new_value}</span></span>
                        )}
                        {log.action === 'Uploaded' && (
                          <span className="text-gray-500"> — {log.new_value}</span>
                        )}
                        {log.action === 'Deleted' && (
                          <span className="text-gray-500"> — {log.old_value}</span>
                        )}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents and Photos</h2>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {uploading ? 'Uploading...' : '+ Upload'}
              <input
                type="file"
                onChange={handleUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </label>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">📁</p>
              <p>No documents yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {doc.file_type?.includes('image') ? '🖼️' :
                       doc.file_type?.includes('pdf') ? '📄' : '📎'}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, `${id}/${doc.file_name}`, doc.file_name)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}