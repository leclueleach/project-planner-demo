import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, FolderOpen, Archive, MoreVertical, AlertTriangle, Trash2, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Department {
  id: string
  name: string
  archived: boolean
  sort_order: number
  created_at: string
  deleted_at: string | null
}

export default function DepartmentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    const handleClick = () => setMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .or(`deleted_at.is.null,deleted_at.gte.${fiveDaysAgo.toISOString()}`)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Department[]
    }
  })

  const { data: projectCounts = {} } = useQuery({
    queryKey: ['project-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('department_id').eq('archived', false)
      if (error) throw error
      const counts: Record<string, number> = {}
      data.forEach((p: { department_id: string }) => { counts[p.department_id] = (counts[p.department_id] || 0) + 1 })
      return counts
    }
  })

  const { data: deptWarnings = [] } = useQuery({
    queryKey: ['dept-warnings'],
    queryFn: async () => {
      if (departments.length === 0) return []
      const deptIds = departments.filter(d => !d.deleted_at).map(d => d.id)
      if (deptIds.length === 0) return []
      const { data: projs } = await supabase.from('projects').select('id, department_id, planned_start_date, planned_end_date').in('department_id', deptIds)
      if (!projs?.length) return []
      const projIds = projs.map(p => p.id)
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projIds)
      if (!comps?.length) return []
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return []
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, start_date, end_date').in('issue_id', issueIds)
      if (!fields?.length) return []
      const compToProject: Record<string, string> = {}
      comps.forEach(c => { compToProject[c.id] = c.project_id })
      const issueToProject: Record<string, string> = {}
      issuesList.forEach(i => { issueToProject[i.id] = compToProject[i.component_id] })
      const warningDeptIds = new Set<string>()
      fields.forEach(f => {
        const proj = projs.find(p => p.id === issueToProject[f.issue_id])
        if (!proj) return
        if (proj.planned_start_date && f.start_date && f.start_date < proj.planned_start_date) warningDeptIds.add(proj.department_id)
        if (proj.planned_end_date && f.end_date && f.end_date > proj.planned_end_date) warningDeptIds.add(proj.department_id)
      })
      return Array.from(warningDeptIds)
    },
    enabled: departments.length > 0
  })

  const { data: deptProgress = {} } = useQuery({
    queryKey: ['dept-progress'],
    queryFn: async () => {
      if (departments.length === 0) return {}
      const deptIds = departments.filter(d => !d.deleted_at).map(d => d.id)
      if (deptIds.length === 0) return {}
      const { data: projs } = await supabase.from('projects').select('id, department_id').in('department_id', deptIds).eq('archived', false)
      if (!projs?.length) return {}
      const projIds = projs.map(p => p.id)
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projIds)
      if (!comps?.length) return {}
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return {}
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, status_id').in('issue_id', issueIds)
      if (!fields?.length) return {}
      const { data: completeStatus } = await supabase.from('statuses').select('id').eq('name', 'Complete').single()
      if (!completeStatus) return {}
      const compToProject: Record<string, string> = {}
      comps.forEach(c => { compToProject[c.id] = c.project_id })
      const issueToComp: Record<string, string> = {}
      issuesList.forEach(i => { issueToComp[i.id] = i.component_id })
      const issueFieldMap: Record<string, { total: number; complete: number }> = {}
      fields.forEach(f => {
        if (!issueFieldMap[f.issue_id]) issueFieldMap[f.issue_id] = { total: 0, complete: 0 }
        issueFieldMap[f.issue_id].total++
        if (f.status_id === completeStatus.id) issueFieldMap[f.issue_id].complete++
      })
      const issueProgressMap: Record<string, number> = {}
      Object.entries(issueFieldMap).forEach(([issueId, { total, complete }]) => {
        issueProgressMap[issueId] = total > 0 ? Math.round((complete / total) * 100) : 0
      })
      const compProgress: Record<string, number> = {}
      comps.forEach(c => {
        const compIssues = issuesList.filter(i => i.component_id === c.id)
        if (compIssues.length === 0) { compProgress[c.id] = 0; return }
        compProgress[c.id] = Math.round(compIssues.reduce((sum, i) => sum + (issueProgressMap[i.id] || 0), 0) / compIssues.length)
      })
      const projProgress: Record<string, number> = {}
      projs.forEach(p => {
        const projComps = comps.filter(c => c.project_id === p.id)
        if (projComps.length === 0) { projProgress[p.id] = 0; return }
        projProgress[p.id] = Math.round(projComps.reduce((sum, c) => sum + (compProgress[c.id] || 0), 0) / projComps.length)
      })
      const deptProgressMap: Record<string, number> = {}
      deptIds.forEach(deptId => {
        const deptProjs = projs.filter(p => p.department_id === deptId)
        if (deptProjs.length === 0) { deptProgressMap[deptId] = 0; return }
        deptProgressMap[deptId] = Math.round(deptProjs.reduce((sum, p) => sum + (projProgress[p.id] || 0), 0) / deptProjs.length)
      })
      return deptProgressMap
    },
    enabled: departments.length > 0
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('departments').insert({ name, sort_order: departments.length })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setNewName(''); setShowAdd(false)
    }
  })

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('departments').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] })
  })

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from('departments').update({ archived }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setMenuOpen(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setConfirmDelete(null)
      setMenuOpen(null)
    }
  })

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setMenuOpen(null)
    }
  })

  const daysUntilExpiry = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const expiry = new Date(deleted)
    expiry.setDate(expiry.getDate() + 5)
    const now = new Date()
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const active = departments.filter(d => !d.archived && !d.deleted_at)
  const archived = departments.filter(d => d.archived && !d.deleted_at)
  const deleted = departments.filter(d => d.deleted_at)

  if (isLoading) {
    return <div className="spinner-wrap"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">{active.length} active department{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="add-form" style={{ marginBottom: '24px' }}>
          <input autoFocus type="text" placeholder="Department name..." value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) addMutation.mutate(newName.trim())
              if (e.key === 'Escape') { setShowAdd(false); setNewName('') }
            }} />
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate(newName.trim())} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      {/* Active Departments */}
      {active.length === 0 && !showAdd ? (
        <div className="empty-state">
          <Building2 size={32} style={{ color: '#d1d5db', margin: '0 auto' }} />
          <p>No departments yet</p>
          <span>Add your first department to get started</span>
        </div>
      ) : (
        <div className="cards-grid" style={{ marginBottom: '32px' }}>
          {active.map(dept => (
            <div key={dept.id} className="dept-card" onClick={() => navigate(`/departments/${dept.id}`)}>
              <button className="menu-btn"
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id) }}>
                <MoreVertical size={16} />
              </button>

              {menuOpen === dept.id && (
                <div className="dropdown" style={{ zIndex: 20 }}>
                  <button className="dropdown-item" onClick={e => { e.stopPropagation(); archiveMutation.mutate({ id: dept.id, archived: true }) }}>
                    <Archive size={14} /> Archive
                  </button>
                  {confirmDelete === dept.id ? (
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#ef4444' }}>Delete?</span>
                      <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={e => { e.stopPropagation(); deleteMutation.mutate(dept.id) }}>✓</button>
                      <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={e => { e.stopPropagation(); setConfirmDelete(null) }}>✕</button>
                    </div>
                  ) : (
                    <button className="dropdown-item" style={{ color: '#ef4444' }} onClick={e => { e.stopPropagation(); setConfirmDelete(dept.id) }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              )}

              <div className="dept-card-header">
                <div className="dept-icon"><Building2 size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingId === dept.id ? (
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onBlur={() => { renameMutation.mutate({ id: dept.id, name: editName }); setEditingId(null) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { renameMutation.mutate({ id: dept.id, name: editName }); setEditingId(null) }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '14px', fontWeight: '600', border: '1px solid #ed1c24', borderRadius: '4px', padding: '2px 6px', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                    ) : (
                      <div className="dept-name"
                        onClick={e => { e.stopPropagation(); setEditingId(dept.id); setEditName(dept.name) }}
                        style={{ cursor: 'text', borderBottom: '1px dashed transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#d1d5db')}
                        onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
                      >{dept.name}</div>
                    )}
                    {deptWarnings.includes(dept.id) && <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />}
                  </div>
                  <div className="dept-meta">{projectCounts[dept.id] || 0} project{(projectCounts[dept.id] || 0) !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="progress-wrap">
                <div className="progress-label">
                  <span>Progress</span>
                  <span>{deptProgress[dept.id] || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${deptProgress[dept.id] || 0}%` }} />
                </div>
              </div>

              <div className="dept-card-footer">
                <FolderOpen size={12} />
                <span>Click to view projects</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p className="section-label">Archived</p>
          <div className="cards-grid">
            {archived.map(dept => (
              <div key={dept.id} className="dept-card archived">
                <button className="menu-btn" style={{ zIndex: 10 }}
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id) }}>
                  <MoreVertical size={16} />
                </button>

                {menuOpen === dept.id && (
                  <div className="dropdown" style={{ zIndex: 20 }}>
                    <button className="dropdown-item" style={{ color: '#2c2c2b' }} onClick={() => archiveMutation.mutate({ id: dept.id, archived: false })}>
                      <Archive size={14} /> Unarchive
                    </button>
                    {confirmDelete === dept.id ? (
                      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>Delete?</span>
                        <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={e => { e.stopPropagation(); deleteMutation.mutate(dept.id) }}>✓</button>
                        <button className="btn-ghost" style={{ padding: '2px 6px' }} onClick={e => { e.stopPropagation(); setConfirmDelete(null) }}>✕</button>
                      </div>
                    ) : (
                      <button className="dropdown-item" style={{ color: '#ef4444' }} onClick={e => { e.stopPropagation(); setConfirmDelete(dept.id) }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                )}

                <div style={{ opacity: 0.6 }}>
                  <div className="dept-card-header">
                    <div className="dept-icon" style={{ background: '#e5e7eb' }}>
                      <Building2 size={18} style={{ color: '#9ca3af' }} />
                    </div>
                    <div>
                      <div className="dept-name" style={{ color: '#9ca3af' }}>{dept.name}</div>
                      <div className="dept-meta">Archived</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Deleted */}
      {deleted.length > 0 && (
        <div>
          <p className="section-label">Recently Deleted</p>
          <div className="cards-grid">
            {deleted.map(dept => (
              <div key={dept.id} className="dept-card" style={{ background: '#fff5f5', border: '1px solid #fecaca', cursor: 'default' }}>
                <button className="menu-btn" style={{ zIndex: 10 }}
                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === dept.id ? null : dept.id) }}>
                  <MoreVertical size={16} />
                </button>

                {menuOpen === dept.id && (
                  <div className="dropdown" style={{ zIndex: 20 }}>
                    <button className="dropdown-item" style={{ color: '#2c2c2b' }} onClick={() => restoreMutation.mutate(dept.id)}>
                      <RotateCcw size={14} /> Restore
                    </button>
                  </div>
                )}

                <div style={{ opacity: 0.7 }}>
                  <div className="dept-card-header">
                    <div className="dept-icon" style={{ background: '#fecaca' }}>
                      <Building2 size={18} style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                      <div className="dept-name" style={{ color: '#9ca3af' }}>{dept.name}</div>
                      <div className="dept-meta" style={{ color: '#ef4444' }}>
                        Deleted · {daysUntilExpiry(dept.deleted_at!)} day{daysUntilExpiry(dept.deleted_at!) !== 1 ? 's' : ''} left
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}