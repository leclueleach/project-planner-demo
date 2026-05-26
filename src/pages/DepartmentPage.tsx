import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ArrowLeft, FolderOpen, Archive, MoreVertical, ChevronRight, AlertTriangle, Trash2, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Department { id: string; name: string; archived: boolean }
interface Project {
  id: string
  department_id: string
  name: string
  planned_start_date: string | null
  planned_end_date: string | null
  archived: boolean
  sort_order: number
  deleted_at: string | null
}

function ConfirmAction({ label = 'Confirm?', onConfirm, onCancel }: { label?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: '#ef4444' }}>{label}</span>
      <button className="btn-ghost" onClick={onConfirm}>✓</button>
      <button className="btn-ghost" onClick={onCancel}>✕</button>
    </div>
  )
}

export default function DepartmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    const handleClick = () => setMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const { data: department } = useQuery({
    queryKey: ['department', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('id', id).single()
      if (error) throw error
      return data as Department
    }
  })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('department_id', id)
        .or(`deleted_at.is.null,deleted_at.gte.${fiveDaysAgo.toISOString()}`)
        .order('sort_order')
      if (error) throw error
      return data as Project[]
    }
  })

  const { data: projectWarnings = [] } = useQuery({
    queryKey: ['project-warnings', id],
    queryFn: async () => {
      if (projects.length === 0) return []
      const projectIds = projects.filter(p => !p.deleted_at).map(p => p.id)
      if (projectIds.length === 0) return []
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projectIds)
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
      const warningProjectIds = new Set<string>()
      fields.forEach(f => {
        const proj = projects.find(p => p.id === issueToProject[f.issue_id])
        if (!proj) return
        if (proj.planned_start_date && f.start_date && f.start_date < proj.planned_start_date) warningProjectIds.add(proj.id)
        if (proj.planned_end_date && f.end_date && f.end_date > proj.planned_end_date) warningProjectIds.add(proj.id)
      })
      return Array.from(warningProjectIds)
    },
    enabled: projects.length > 0
  })

  const { data: projectProgress = {} } = useQuery({
    queryKey: ['project-progress', id],
    queryFn: async () => {
      if (projects.length === 0) return {}
      const projectIds = projects.filter(p => !p.deleted_at).map(p => p.id)
      if (projectIds.length === 0) return {}
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projectIds)
      if (!comps?.length) return {}
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return {}
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, status_id').in('issue_id', issueIds)
      if (!fields?.length) return {}
      const { data: completeStatus } = await supabase.from('statuses').select('id').eq('name', 'Complete').single()
      if (!completeStatus) return {}
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
      const progress: Record<string, number> = {}
      projectIds.forEach(projId => {
        const projComps = comps.filter(c => c.project_id === projId)
        if (projComps.length === 0) { progress[projId] = 0; return }
        progress[projId] = Math.round(projComps.reduce((sum, c) => sum + (compProgress[c.id] || 0), 0) / projComps.length)
      })
      return progress
    },
    enabled: projects.length > 0
  })

  const { data: projectActualDates = {} } = useQuery({
    queryKey: ['project-actual-dates', id],
    queryFn: async () => {
      if (projects.length === 0) return {}
      const projectIds = projects.filter(p => !p.deleted_at).map(p => p.id)
      if (projectIds.length === 0) return {}
      const { data: comps } = await supabase.from('components').select('id, project_id').in('project_id', projectIds)
      if (!comps?.length) return {}
      const compIds = comps.map(c => c.id)
      const { data: issuesList } = await supabase.from('issues').select('id, component_id').in('component_id', compIds)
      if (!issuesList?.length) return {}
      const issueIds = issuesList.map(i => i.id)
      const { data: fields } = await supabase.from('issue_fields').select('issue_id, start_date, end_date').in('issue_id', issueIds)
      if (!fields?.length) return {}
      const compToProject: Record<string, string> = {}
      comps.forEach(c => { compToProject[c.id] = c.project_id })
      const issueToProject: Record<string, string> = {}
      issuesList.forEach(i => { issueToProject[i.id] = compToProject[i.component_id] })
      const dates: Record<string, { start: string | null; end: string | null }> = {}
      projectIds.forEach(pid => { dates[pid] = { start: null, end: null } })
      fields.forEach(f => {
        const projId = issueToProject[f.issue_id]
        if (!projId) return
        if (f.start_date && (!dates[projId].start || f.start_date < dates[projId].start!)) dates[projId].start = f.start_date
        if (f.end_date && (!dates[projId].end || f.end_date > dates[projId].end!)) dates[projId].end = f.end_date
      })
      return dates
    },
    enabled: projects.length > 0
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('projects').insert({
        name, department_id: id, sort_order: projects.length, archived: false,
        planned_start_date: newStartDate || null, planned_end_date: newEndDate || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setNewName(''); setNewStartDate(''); setNewEndDate(''); setShowAdd(false)
    }
  })

  const archiveMutation = useMutation({
    mutationFn: async ({ projectId, archived }: { projectId: string; archived: boolean }) => {
      const { error } = await supabase.from('projects').update({ archived }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setConfirmArchive(null); setMenuOpen(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setConfirmDelete(null); setMenuOpen(null)
    }
  })

  const restoreMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').update({ deleted_at: null }).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      setMenuOpen(null)
    }
  })

  const daysUntilExpiry = (deletedAt: string) => {
    const expiry = new Date(deletedAt)
    expiry.setDate(expiry.getDate() + 5)
    const diff = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const active = projects.filter(p => !p.archived && !p.deleted_at)
  const archived = projects.filter(p => p.archived && !p.deleted_at)
  const deleted = projects.filter(p => p.deleted_at)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const [year, month, day] = dateStr.split('-')
    return `${year}/${month}/${day}`
  }

  if (isLoading) {
    return <div className="spinner-wrap"><div className="spinner" /></div>
  }

  const headerCols = '2fr 110px 110px 110px 110px 150px 44px'

  return (
    <div>
      <button className="btn-ghost" onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
        <ArrowLeft size={16} /> Back to Departments
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{department?.name}</h1>
          <p className="page-subtitle">{active.length} active project{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Project
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="add-form" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
          <input autoFocus type="text" placeholder="Project name..." value={newName}
            onChange={e => setNewName(e.target.value)} style={{ minWidth: '200px' }}
            onKeyDown={e => { if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Planned Start</label>
            <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Planned End</label>
            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button className="btn-primary" onClick={() => newName.trim() && addMutation.mutate(newName.trim())} disabled={!newName.trim()}>Add</button>
          <button className="btn-ghost" onClick={() => { setShowAdd(false); setNewName(''); setNewStartDate(''); setNewEndDate('') }}>Cancel</button>
        </div>
      )}

      {/* Active Projects */}
      {active.length === 0 && !showAdd ? (
        <div className="empty-state">
          <FolderOpen size={32} style={{ color: '#d1d5db', margin: '0 auto' }} />
          <p>No projects yet</p>
          <span>Add your first project to get started</span>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'visible', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRadius: '12px 12px 0 0' }}>
            {['Project', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>

          {active.map((project, i) => (
            <div key={project.id}
              style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '14px 20px', borderBottom: i < active.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
              onClick={() => navigate(`/projects/${project.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c2c2b' }}>{project.name}</span>
                {projectWarnings.includes(project.id) && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_start_date)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_end_date)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(projectActualDates[project.id]?.start || null)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(projectActualDates[project.id]?.end || null)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', borderRadius: '999px', width: `${projectProgress[project.id] || 0}%` }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px', textAlign: 'right' }}>{projectProgress[project.id] || 0}%</span>
              </div>
              <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                <button className="btn-ghost" onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}>
                  <MoreVertical size={15} />
                </button>
                {menuOpen === project.id && (
                  <div className="dropdown" style={{ right: 0, left: 'auto', zIndex: 30 }}>
                    {confirmArchive === project.id ? (
                      <div style={{ padding: '8px 12px' }}>
                        <ConfirmAction label="Archive?" onConfirm={() => archiveMutation.mutate({ projectId: project.id, archived: true })} onCancel={() => setConfirmArchive(null)} />
                      </div>
                    ) : (
                      <button className="dropdown-item" onClick={() => setConfirmArchive(project.id)}>
                        <Archive size={14} /> Archive
                      </button>
                    )}
                    {confirmDelete === project.id ? (
                      <div style={{ padding: '8px 12px' }}>
                        <ConfirmAction label="Delete?" onConfirm={() => deleteMutation.mutate(project.id)} onCancel={() => setConfirmDelete(null)} />
                      </div>
                    ) : (
                      <button className="dropdown-item" style={{ color: '#ef4444' }} onClick={() => setConfirmDelete(project.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived Projects */}
      {archived.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <p className="section-label">Archived Projects</p>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'visible' }}>
            {archived.map((project, i) => (
              <div key={project.id} style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '14px 20px', borderBottom: i < archived.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                  <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{project.name}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', opacity: 0.5 }}>{formatDate(project.planned_start_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', opacity: 0.5 }}>{formatDate(project.planned_end_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', opacity: 0.5 }}>{formatDate(projectActualDates[project.id]?.start || null)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', opacity: 0.5 }}>{formatDate(projectActualDates[project.id]?.end || null)}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', opacity: 0.5 }}>Archived</div>
                <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-ghost" onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}>
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === project.id && (
                    <div className="dropdown" style={{ right: 0, left: 'auto', zIndex: 30 }}>
                      <button className="dropdown-item" style={{ color: '#2c2c2b' }} onClick={() => archiveMutation.mutate({ projectId: project.id, archived: false })}>
                        <Archive size={14} /> Unarchive
                      </button>
                      {confirmDelete === project.id ? (
                        <div style={{ padding: '8px 12px' }}>
                          <ConfirmAction label="Delete?" onConfirm={() => deleteMutation.mutate(project.id)} onCancel={() => setConfirmDelete(null)} />
                        </div>
                      ) : (
                        <button className="dropdown-item" style={{ color: '#ef4444' }} onClick={() => setConfirmDelete(project.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  )}
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
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', overflow: 'visible' }}>
            {deleted.map((project, i) => (
              <div key={project.id} style={{ display: 'grid', gridTemplateColumns: headerCols, gap: '12px', padding: '14px 20px', borderBottom: i < deleted.length - 1 ? '1px solid #fecaca' : 'none', alignItems: 'center', opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChevronRight size={14} style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>{project.name}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_start_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(project.planned_end_date)}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>—</div>
                <div style={{ fontSize: '12px', color: '#ef4444' }}>
                  {daysUntilExpiry(project.deleted_at!)} day{daysUntilExpiry(project.deleted_at!) !== 1 ? 's' : ''} left
                </div>
                <div style={{ position: 'relative', zIndex: 10 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-ghost" onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}>
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === project.id && (
                    <div className="dropdown" style={{ right: 0, left: 'auto', zIndex: 30 }}>
                      <button className="dropdown-item" style={{ color: '#2c2c2b' }} onClick={() => restoreMutation.mutate(project.id)}>
                        <RotateCcw size={14} /> Restore
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}