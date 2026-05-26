import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users, UserCheck, Tag, Calendar, ChevronUp, ChevronDown, Check, X, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Tab = 'statuses' | 'staff' | 'nonworkdays' | 'users'

interface Status { id: string; name: string; colour: string; sort_order: number; is_system: boolean }
interface Staff { id: string; name: string; email: string | null; type: 'internal' | 'freelancer'; active: boolean }
interface NonWorkDay { id: string; date: string; name: string; type: 'public_holiday' | 'company_holiday' }

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: '#ef4444' }}>Delete?</span>
      <button className="btn-ghost" onClick={onConfirm} title="Confirm">
        <Check size={14} style={{ color: '#ef4444' }} />
      </button>
      <button className="btn-ghost" onClick={onCancel} title="Cancel">
        <X size={14} style={{ color: '#6b7280' }} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('statuses')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your app configuration</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
        {([
          { key: 'statuses', label: 'Task Statuses', icon: Tag },
          { key: 'staff', label: 'Staff', icon: UserCheck },
          { key: 'nonworkdays', label: 'Non-Work Days', icon: Calendar },
          { key: 'users', label: 'People with Access', icon: Users },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', fontSize: '14px', fontWeight: '500',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === key ? '2px solid #ed1c24' : '2px solid transparent',
              color: activeTab === key ? '#ed1c24' : '#6b7280',
              marginBottom: '-1px', transition: 'all 0.15s'
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'statuses' && <StatusesTab />}
      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'nonworkdays' && <NonWorkDaysTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  )
}

// ── STATUSES ─────────────────────────────────────────────────
function StatusesTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColour, setNewColour] = useState('#6b7280')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColour, setEditColour] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('statuses').select('*').order('sort_order')
      if (error) throw error
      return data as Status[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('statuses').insert({ name: newName.trim(), colour: newColour, sort_order: statuses.length })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setNewName(''); setNewColour('#6b7280'); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, colour }: { id: string; name: string; colour: string }) => {
      const { error } = await supabase.from('statuses').update({ name, colour }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setEditingId(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('statuses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['statuses'] }); setConfirmDelete(null) }
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = statuses.findIndex(s => s.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= statuses.length) return
      const a = statuses[idx]
      const b = statuses[swapIdx]
      await supabase.from('statuses').update({ sort_order: b.sort_order }).eq('id', a.id)
      await supabase.from('statuses').update({ sort_order: a.sort_order }).eq('id', b.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statuses'] })
  })

  const startEdit = (s: Status) => { setEditingId(s.id); setEditName(s.name); setEditColour(s.colour) }

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{statuses.length} statuses</p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Status</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px' }}>
          <input autoFocus type="text" placeholder="Status name..." value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addMutation.mutate(); if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }} />
          <input type="color" value={newColour} onChange={e => setNewColour(e.target.value)}
            style={{ width: '40px', height: '36px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', padding: '2px' }} />
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate()} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {statuses.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: i < statuses.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
            
            {/* Reorder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderMutation.mutate({ id: s.id, direction: 'up' })} disabled={i === 0}><ChevronUp size={12} /></button>
              <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderMutation.mutate({ id: s.id, direction: 'down' })} disabled={i === statuses.length - 1}><ChevronDown size={12} /></button>
            </div>

            {editingId === s.id ? (
  <>
    <input type="color" value={editColour} onChange={e => setEditColour(e.target.value)}
      style={{ width: '32px', height: '32px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
      onKeyDown={e => { if (e.key === 'Enter') updateMutation.mutate({ id: s.id, name: editName, colour: editColour }); if (e.key === 'Escape') setEditingId(null) }}
      style={{ flex: 1, fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }} />
    <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: s.id, name: editName, colour: editColour })}><Check size={14} style={{ color: '#10b981' }} /></button>
    <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
  </>
) : (
  <>
    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.colour, flexShrink: 0 }} />
    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', cursor: s.is_system ? 'default' : 'pointer' }}
      onClick={() => !s.is_system && startEdit(s)}>{s.name}</span>
    {s.is_system
      ? <span style={{ fontSize: '11px', color: '#9ca3af', padding: '2px 8px', background: '#f3f4f6', borderRadius: '20px' }}>System</span>
      : <>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>click to edit</span>
          {confirmDelete === s.id
            ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(s.id)} onCancel={() => setConfirmDelete(null)} />
            : <button className="btn-ghost" onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
          }
        </>
    }
  </>
)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── STAFF ────────────────────────────────────────────────────
function StaffTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newType, setNewType] = useState<'internal' | 'freelancer'>('internal')
  const [filter, setFilter] = useState<'all' | 'internal' | 'freelancer'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editType, setEditType] = useState<'internal' | 'freelancer'>('internal')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('name')
      if (error) throw error
      return data as Staff[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('staff').insert({ name: newName.trim(), email: newEmail.trim() || null, type: newType, active: true })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setNewName(''); setNewEmail(''); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, email, type }: { id: string; name: string; email: string; type: string }) => {
      const { error } = await supabase.from('staff').update({ name, email: email || null, type }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setEditingId(null) }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('staff').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setConfirmDelete(null) }
  })

  const startEdit = (s: Staff) => { setEditingId(s.id); setEditName(s.name); setEditEmail(s.email || ''); setEditType(s.type) }
  const filtered = staff.filter(s => filter === 'all' || s.type === filter)

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'internal', 'freelancer'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', fontSize: '13px', fontWeight: '500', borderRadius: '20px',
              border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === f ? '#ed1c24' : 'white',
              borderColor: filter === f ? '#ed1c24' : '#e5e7eb',
              color: filter === f ? 'white' : '#6b7280'
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Staff</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <input autoFocus type="text" placeholder="Full name..." value={newName} onChange={e => setNewName(e.target.value)} style={{ minWidth: '150px' }} />
          <input type="email" placeholder="Email (optional)..." value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ minWidth: '150px' }} />
          <select value={newType} onChange={e => setNewType(e.target.value as 'internal' | 'freelancer')}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}>
            <option value="internal">Internal</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate()} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No staff found</div>
          : filtered.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', opacity: s.active ? 1 : 0.5 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: s.type === 'internal' ? '#dbeafe' : '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: s.type === 'internal' ? '#1d4ed8' : '#be185d' }}>
                {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              {editingId === s.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    style={{ fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '120px' }} />
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '150px' }} />
                  <select value={editType} onChange={e => setEditType(e.target.value as 'internal' | 'freelancer')}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="internal">Internal</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                  <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: s.id, name: editName, email: editEmail, type: editType })}><Check size={14} style={{ color: '#10b981' }} /></button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => startEdit(s)}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{s.name}</div>
                    {s.email && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.email}</div>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: s.type === 'internal' ? '#dbeafe' : '#fce7f3', color: s.type === 'internal' ? '#1d4ed8' : '#be185d' }}>{s.type}</span>
                  <button className="btn-ghost" onClick={() => toggleActiveMutation.mutate({ id: s.id, active: !s.active })} style={{ fontSize: '12px', color: s.active ? '#10b981' : '#9ca3af' }}>{s.active ? 'Active' : 'Inactive'}</button>
                  {confirmDelete === s.id
                    ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(s.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── NON-WORK DAYS ────────────────────────────────────────────
function NonWorkDaysTab() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'public_holiday' | 'company_holiday'>('public_holiday')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'public_holiday' | 'company_holiday'>('public_holiday')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: days = [] } = useQuery({
    queryKey: ['non_work_days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('non_work_days').select('*').order('date')
      if (error) throw error
      return data as NonWorkDay[]
    }
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('non_work_days').insert({ date: newDate, name: newName.trim(), type: newType })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setNewDate(''); setNewName(''); setShowAdd(false) }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, type }: { id: string; name: string; type: string }) => {
      const { error } = await supabase.from('non_work_days').update({ name, type }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setEditingId(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('non_work_days').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['non_work_days'] }); setConfirmDelete(null) }
  })

  const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{days.length} non-work days</p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Day</button>
      </div>

      {showAdd && (
        <div className="add-form" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          <input autoFocus type="text" placeholder="e.g. Christmas Day..." value={newName} onChange={e => setNewName(e.target.value)} style={{ minWidth: '200px' }} />
          <select value={newType} onChange={e => setNewType(e.target.value as 'public_holiday' | 'company_holiday')}
            style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}>
            <option value="public_holiday">Public Holiday</option>
            <option value="company_holiday">Company Holiday</option>
          </select>
          <button className="btn-primary" onClick={() => newDate && newName.trim() && addMutation.mutate()} disabled={!newDate || !newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewDate('') }}>Cancel</button>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {days.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No non-work days added yet</div>
          : days.map((day, i) => (
            <div key={day.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < days.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              {editingId === day.id ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    style={{ fontSize: '14px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '180px' }} />
                  <select value={editType} onChange={e => setEditType(e.target.value as 'public_holiday' | 'company_holiday')}
                    style={{ fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="public_holiday">Public Holiday</option>
                    <option value="company_holiday">Company Holiday</option>
                  </select>
                  <button className="btn-ghost" onClick={() => updateMutation.mutate({ id: day.id, name: editName, type: editType })}><Check size={14} style={{ color: '#10b981' }} /></button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}><X size={14} style={{ color: '#6b7280' }} /></button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setEditingId(day.id); setEditName(day.name); setEditType(day.type) }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{day.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(day.date)}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: day.type === 'public_holiday' ? '#fef3c7' : '#dbeafe', color: day.type === 'public_holiday' ? '#92400e' : '#1d4ed8' }}>
                    {day.type === 'public_holiday' ? 'Public Holiday' : 'Company Holiday'}
                  </span>
                  {confirmDelete === day.id
                    ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(day.id)} onCancel={() => setConfirmDelete(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDelete(day.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── USERS TAB ────────────────────────────────────────────────
function UsersTab() {
    const queryClient = useQueryClient()
    const [showInvite, setShowInvite] = useState(false)
    const [inviteName, setInviteName] = useState('')
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [tempPasswordModal, setTempPasswordModal] = useState<{ name: string; email: string; password: string } | null>(null)
  
    useEffect(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('app_users').select('id').eq('auth_id', user.id).single()
            .then(({ data }) => { if (data) setCurrentUserId(data.id) })
        }
      })
    }, [])
  
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
      return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }
  
    const { data: users = [] } = useQuery({
      queryKey: ['app_users'],
      queryFn: async () => {
        const fiveDaysAgo = new Date()
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
        const { data, error } = await supabase
          .from('app_users')
          .select('*, invited_by_user:invited_by(name)')
          .or(`deleted_at.is.null,deleted_at.gte.${fiveDaysAgo.toISOString()}`)
          .order('created_at')
        if (error) throw error
        return data
      }
    })
  
    const inviteMutation = useMutation({
        mutationFn: async () => {
          const tempPassword = generatePassword()
      
          const response = await fetch('/api/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: inviteName,
              email: inviteEmail,
              role: inviteRole,
              invitedBy: currentUserId,
              tempPassword
            })
          })
      
          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create user')
          }
      
          return { name: inviteName, email: inviteEmail, password: tempPassword }
        },
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['app_users'] })
          setTempPasswordModal(data)
          setInviteName(''); setInviteEmail(''); setShowInvite(false)
        }
      })
  
    const suspendMutation = useMutation({
      mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) => {
        const { error } = await supabase.from('app_users').update({ status }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app_users'] })
    })
  
    const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('app_users').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app_users'] }); setConfirmDelete(null) }
    })
  
    const restoreMutation = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('app_users').update({ deleted_at: null, status: 'active' }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app_users'] })
    })
  
    const daysUntilExpiry = (deletedAt: string) => {
      const expiry = new Date(deletedAt)
      expiry.setDate(expiry.getDate() + 5)
      return Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }
  
    const [copied, setCopied] = useState(false)
    const copyPassword = (password: string) => {
      navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  
    const activeUsers = users.filter((u: any) => !u.deleted_at && u.status !== 'suspended')
    const suspendedUsers = users.filter((u: any) => !u.deleted_at && u.status === 'suspended')
    const deletedUsers = users.filter((u: any) => u.deleted_at)
  
    return (
      <div style={{ maxWidth: '700px' }}>
  
        {/* Temp Password Modal */}
        {tempPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={20} style={{ color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#2c2c2b' }}>User Created Successfully</h3>
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Share these login details with <strong>{tempPasswordModal.name}</strong>. They will be required to change their password on first login.
              </p>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#2c2c2b', marginBottom: '12px' }}>{tempPasswordModal.email}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Temporary Password</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c2c2b', fontFamily: 'monospace', letterSpacing: '0.05em', flex: 1 }}>{tempPasswordModal.password}</div>
                  <button className="btn-secondary" onClick={() => copyPassword(tempPasswordModal.password)} style={{ fontSize: '12px', padding: '4px 12px' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
                ⚠️ Save this password now — it won't be shown again.
              </div>
              <button className="btn-primary" onClick={() => setTempPasswordModal(null)} style={{ width: '100%', justifyContent: 'center' }}>Done</button>
            </div>
          </div>
        )}
  
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>{activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}</p>
          <button className="btn-primary" onClick={() => setShowInvite(true)}><Plus size={15} /> Add User</button>
        </div>
  
        {showInvite && (
          <div className="add-form" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
            <input autoFocus type="text" placeholder="Full name..." value={inviteName}
              onChange={e => setInviteName(e.target.value)} style={{ minWidth: '150px' }} />
            <input type="email" placeholder="Email address..." value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)} style={{ minWidth: '200px' }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
              style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn-primary"
              onClick={() => inviteName.trim() && inviteEmail.trim() && inviteMutation.mutate()}
              disabled={!inviteName.trim() || !inviteEmail.trim() || inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowInvite(false); setInviteName(''); setInviteEmail('') }}>Cancel</button>
          </div>
        )}
  
        {inviteMutation.isError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
            Failed to create user. The email may already be in use.
          </div>
        )}
  
        {/* Active Users */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
          {activeUsers.length === 0
            ? <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No users yet</div>
            : activeUsers.map((u: any, i: number) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < activeUsers.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: 'white' }}>
                  {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{u.name}</span>
                    {u.id === currentUserId && <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '1px 8px', borderRadius: '20px' }}>You</span>}
                    {u.must_change_password && <span style={{ fontSize: '11px', color: '#92400e', background: '#fef3c7', padding: '1px 8px', borderRadius: '20px' }}>Pending login</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {u.email}
                    {u.invited_by_user && ` · Invited by ${u.invited_by_user.name}`}
                    {u.invited_at && ` on ${new Date(u.invited_at).toLocaleDateString('en-ZA')}`}
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: u.role === 'admin' ? '#fef3c7' : '#dbeafe', color: u.role === 'admin' ? '#92400e' : '#1d4ed8' }}>
                  {u.role}
                </span>
                {u.id !== currentUserId && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-ghost" style={{ fontSize: '12px', color: '#f59e0b' }}
                      onClick={() => suspendMutation.mutate({ id: u.id, status: 'suspended' })}>
                      Suspend
                    </button>
                    {confirmDelete === u.id
                      ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(u.id)} onCancel={() => setConfirmDelete(null)} />
                      : <button className="btn-ghost" onClick={() => setConfirmDelete(u.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                    }
                  </div>
                )}
              </div>
            ))}
        </div>
  
        {/* Suspended Users */}
        {suspendedUsers.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p className="section-label">Suspended</p>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              {suspendedUsers.map((u: any, i: number) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < suspendedUsers.length - 1 ? '1px solid #f3f4f6' : 'none', opacity: 0.7 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{u.name}</span>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 10px', borderRadius: '20px', background: '#fef3c7', color: '#92400e' }}>Suspended</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-ghost" style={{ fontSize: '12px', color: '#10b981' }}
                      onClick={() => suspendMutation.mutate({ id: u.id, status: 'active' })}>
                      Restore
                    </button>
                    {confirmDelete === u.id
                      ? <ConfirmDelete onConfirm={() => deleteMutation.mutate(u.id)} onCancel={() => setConfirmDelete(null)} />
                      : <button className="btn-ghost" onClick={() => setConfirmDelete(u.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
  
        {/* Recently Deleted */}
        {deletedUsers.length > 0 && (
          <div>
            <p className="section-label">Recently Deleted</p>
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', overflow: 'hidden' }}>
              {deletedUsers.map((u: any, i: number) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < deletedUsers.length - 1 ? '1px solid #fecaca' : 'none', opacity: 0.7 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
                    {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{u.name}</span>
                    <div style={{ fontSize: '12px', color: '#ef4444' }}>
                      Deleted · {daysUntilExpiry(u.deleted_at)} day{daysUntilExpiry(u.deleted_at) !== 1 ? 's' : ''} left
                    </div>
                  </div>
                  <button className="btn-ghost" style={{ fontSize: '12px', color: '#2c2c2b', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => restoreMutation.mutate(u.id)}>
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }