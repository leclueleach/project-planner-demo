import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Filter, X } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_name: string | null
  entity_id: string | null
  old_data: any
  new_data: any
  changed_fields: string[] | null
  created_at: string
  user_id: string | null
  user: { name: string } | null
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  INSERT: { label: 'Created', color: '#16a34a', bg: '#f0fdf4' },
  UPDATE: { label: 'Updated', color: '#0066b3', bg: '#dbeafe' },
  DELETE: { label: 'Deleted', color: '#ef4444', bg: '#fef2f2' },
}

const ENTITY_LABELS: Record<string, string> = {
  departments: 'Department',
  projects: 'Project',
  components: 'Component',
  issues: 'Issue',
  categories: 'Category',
  issue_fields: 'Issue Field',
  statuses: 'Status',
  staff: 'Staff',
  non_work_days: 'Non-Work Day',
  app_users: 'User',
}

const FRIENDLY_FIELDS: Record<string, string> = {
  name: 'Name',
  status_id: 'Status',
  assignee_id: 'Assignee',
  lead_time: 'Lead Time',
  start_date: 'Start Date',
  end_date: 'End Date',
  start_date_manual: 'Start Date (Manual)',
  planned_start_date: 'Planned Start',
  planned_end_date: 'Planned End',
  archived: 'Archived',
  deleted_at: 'Deleted',
  active: 'Active',
  sort_order: 'Order',
  colour: 'Colour',
  role: 'Role',
  status: 'Status',
  must_change_password: 'Must Change Password',
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '—'
  if (key === 'archived' || key === 'active' || key === 'must_change_password') return value ? 'Yes' : 'No'
  if (key === 'deleted_at') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = value.split('T')[0].split('-')
    return `${year}/${month}/${day}`
  }
  return String(value)
}

export default function HistoryPage() {
const [filterActions, setFilterActions] = useState<string[]>([])
const [filterEntities, setFilterEntities] = useState<string[]>([])
const [filterUsers, setFilterUsers] = useState<string[]>([])
const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const handleClick = () => setOpenDropdown(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, user:user_id(name)')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data as AuditLog[]
    }
  })

  const { data: users = [] } = useQuery({
    queryKey: ['audit_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_users').select('id, name').order('name')
      if (error) throw error
      return data
    }
  })

  const filtered = logs.filter(log => {
    if (filterActions.length > 0 && !filterActions.includes(log.action)) return false
    if (filterEntities.length > 0 && !filterEntities.includes(log.entity_type)) return false
    if (filterUsers.length > 0 && !filterUsers.includes(log.user_id || '')) return false
    if (filterDateFrom && log.created_at < filterDateFrom) return false
    if (filterDateTo && log.created_at > filterDateTo + 'T23:59:59') return false
    return true
  })
  
  const hasActiveFilters = filterActions.length > 0 || filterEntities.length > 0 || filterUsers.length > 0 || filterDateFrom || filterDateTo

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }

  const getChangeSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') return `Created ${ENTITY_LABELS[log.entity_type] || log.entity_type}`
    if (log.action === 'DELETE') return `Deleted ${ENTITY_LABELS[log.entity_type] || log.entity_type}`
    if (log.action === 'UPDATE' && log.changed_fields) {
      if (log.changed_fields.includes('archived')) return log.new_data?.archived ? 'Archived' : 'Unarchived'
      if (log.changed_fields.includes('deleted_at')) return log.new_data?.deleted_at ? 'Deleted' : 'Restored'
      if (log.changed_fields.includes('status') && log.entity_type === 'app_users') {
        return log.new_data?.status === 'suspended' ? 'Suspended user' : 'Restored user'
      }
      const friendlyFields = log.changed_fields
        .filter(f => !['sort_order', 'updated_at', 'start_date_manual'].includes(f))
        .map(f => FRIENDLY_FIELDS[f] || f)
      if (friendlyFields.length === 0) return 'Updated'
      return `Updated ${friendlyFields.join(', ')}`
    }
    return 'Updated'
  }


  if (isLoading) return <div className="spinner-wrap"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">{filtered.length} entries</p>
        </div>
      </div>

      {/* Filters */}
<div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2c2c2b', fontSize: '13px', fontWeight: '600' }}>
      <Filter size={14} />
      Filter by
    </div>

    {/* Action Filter */}
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'action' ? null : 'action') }}
        style={{ padding: '6px 12px', fontSize: '13px', border: `1px solid ${filterActions.length > 0 ? '#ed1c24' : '#e5e7eb'}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        Action {filterActions.length > 0 && <span style={{ background: '#ed1c24', color: 'white', borderRadius: '20px', padding: '0 6px', fontSize: '11px' }}>{filterActions.length}</span>}
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
      </button>
      {openDropdown === 'action' && (
        <div style={{ position: 'absolute', top: '36px', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px', padding: '4px 0' }}>
          {[{ value: 'INSERT', label: 'Created' }, { value: 'UPDATE', label: 'Updated' }, { value: 'DELETE', label: 'Deleted' }].map(opt => (
            <label key={opt.value} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#2c2c2b' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <input type="checkbox" checked={filterActions.includes(opt.value)}
                onChange={e => setFilterActions(e.target.checked ? [...filterActions, opt.value] : filterActions.filter(v => v !== opt.value))} />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>

    {/* Type Filter */}
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'entity' ? null : 'entity') }}
        style={{ padding: '6px 12px', fontSize: '13px', border: `1px solid ${filterEntities.length > 0 ? '#ed1c24' : '#e5e7eb'}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        Type {filterEntities.length > 0 && <span style={{ background: '#ed1c24', color: 'white', borderRadius: '20px', padding: '0 6px', fontSize: '11px' }}>{filterEntities.length}</span>}
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
      </button>
      {openDropdown === 'entity' && (
        <div style={{ position: 'absolute', top: '36px', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '180px', padding: '4px 0' }}>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <label key={key} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#2c2c2b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <input type="checkbox" checked={filterEntities.includes(key)}
                onChange={e => setFilterEntities(e.target.checked ? [...filterEntities, key] : filterEntities.filter(v => v !== key))} />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>

    {/* User Filter */}
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === 'user' ? null : 'user') }}
        style={{ padding: '6px 12px', fontSize: '13px', border: `1px solid ${filterUsers.length > 0 ? '#ed1c24' : '#e5e7eb'}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        User {filterUsers.length > 0 && <span style={{ background: '#ed1c24', color: 'white', borderRadius: '20px', padding: '0 6px', fontSize: '11px' }}>{filterUsers.length}</span>}
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
      </button>
      {openDropdown === 'user' && (
        <div style={{ position: 'absolute', top: '36px', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', padding: '4px 0' }}>
          {users.map((u: any) => (
            <label key={u.id} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#2c2c2b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <input type="checkbox" checked={filterUsers.includes(u.id)}
                onChange={e => setFilterUsers(e.target.checked ? [...filterUsers, u.id] : filterUsers.filter(v => v !== u.id))} />
              {u.name}
            </label>
          ))}
        </div>
      )}
    </div>

    {/* Date Range */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#2c2c2b', fontWeight: '500', whiteSpace: 'nowrap' }}>From</label>
      <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
        style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b' }} />
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#2c2c2b', fontWeight: '500', whiteSpace: 'nowrap' }}>To</label>
      <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
        style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b' }} />
    </div>

    {hasActiveFilters && (
      <button className="btn-ghost"
        onClick={() => { setFilterActions([]); setFilterEntities([]); setFilterUsers([]); setFilterDateFrom(''); setFilterDateTo('') }}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#ef4444' }}>
        <X size={13} /> Clear all
      </button>
    )}
  </div>
</div>

      {/* Log Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No history entries found</p>
          <span>Actions will appear here as changes are made</span>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 180px 1fr 120px 160px 24px', gap: '12px', padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Action', 'Type', 'Name', 'Summary', 'User', 'Date', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>

          {filtered.map((log, i) => {
            const actionStyle = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', bg: '#f3f4f6' }
            const isExpanded = expandedId === log.id
            const hasDetails = log.action === 'UPDATE' && log.changed_fields && log.changed_fields.filter(f => !['sort_order', 'updated_at'].includes(f)).length > 0

            return (
              <div key={log.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '80px 100px 180px 1fr 120px 160px 24px', gap: '12px', padding: '12px 16px', alignItems: 'center', cursor: hasDetails ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
                  onMouseEnter={e => { if (hasDetails) e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={e => { if (hasDetails) e.currentTarget.style.background = 'white' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: actionStyle.bg, color: actionStyle.color, textAlign: 'center', display: 'inline-block' }}>
                    {actionStyle.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {ENTITY_LABELS[log.entity_type] || log.entity_type}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#2c2c2b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.entity_name || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {getChangeSummary(log)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {log.user?.name || '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {formatDate(log.created_at)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {hasDetails ? (isExpanded ? '▲' : '▼') : ''}
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && hasDetails && log.changed_fields && (
                  <div style={{ padding: '0 16px 12px 16px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9ca3af', fontWeight: '600', width: '180px' }}>Field</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9ca3af', fontWeight: '600', width: '200px' }}>Before</th>
                          <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9ca3af', fontWeight: '600' }}>After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.changed_fields
                          .filter(f => !['sort_order', 'updated_at'].includes(f))
                          .map(field => (
                            <tr key={field} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '6px 8px', color: '#374151', fontWeight: '500' }}>
                                {FRIENDLY_FIELDS[field] || field}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#ef4444' }}>
                                {formatValue(field, log.old_data?.[field])}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#16a34a' }}>
                                {formatValue(field, log.new_data?.[field])}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}