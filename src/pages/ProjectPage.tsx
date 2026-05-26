import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ArrowLeft, ChevronUp, ChevronDown, Trash2, Check, X, Settings2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── TYPES ─────────────────────────────────────────────────────
interface Project { id: string; department_id: string; name: string; planned_start_date: string | null; planned_end_date: string | null }
interface Category { id: string; project_id: string; name: string; sort_order: number }
interface Component { id: string; project_id: string; name: string; sort_order: number }
interface Issue { id: string; component_id: string; name: string; sort_order: number }
interface Status { id: string; name: string; colour: string; is_system: boolean }
interface Staff { id: string; name: string; active: boolean }
interface IssueField { id: string; issue_id: string; category_id: string; assignee_id: string | null; lead_time: number | null; start_date: string | null; end_date: string | null; start_date_manual: boolean; status_id: string | null }
interface NonWorkDay { date: string; type: string }

// ── DATE UTILS ────────────────────────────────────────────────
function isNonWorkDay(date: Date, nonWorkDays: NonWorkDay[]): boolean {
    const day = date.getDay()
    if (day === 0 || day === 6) return true
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    return nonWorkDays.some(nwd => {
      if (nwd.date === dateStr) return true
      if (nwd.type === 'public_holiday') {
        const [ny, nm, nd] = nwd.date.split('-').map(Number)
        const nwdDate = new Date(ny, nm - 1, nd)
        if (nwdDate.getDay() === 0) {
          const monday = new Date(nwdDate)
          monday.setDate(monday.getDate() + 1)
          const my = monday.getFullYear()
          const mm = String(monday.getMonth() + 1).padStart(2, '0')
          const mdd = String(monday.getDate()).padStart(2, '0')
          return `${my}-${mm}-${mdd}` === dateStr
        }
      }
      return false
    })
  }

function addWorkingDays(startDate: string, days: number, nonWorkDays: NonWorkDay[]): string {
    const [year, month, day] = startDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    let added = 0
    while (added < days) {
      date.setDate(date.getDate() + 1)
      if (!isNonWorkDay(date, nonWorkDays)) added++
    }
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function nextWorkingDay(dateStr: string, nonWorkDays: NonWorkDay[]): string {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + 1)
    while (isNonWorkDay(date, nonWorkDays)) date.setDate(date.getDate() + 1)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    const [year, month, day] = dateStr.split('-')
    return `${year}/${month}/${day}`
  }

function advanceToWorkingDay(dateStr: string, nonWorkDays: NonWorkDay[]): string {
    const [year, month, day] = dateStr.split('-').map(Number)
    let d = new Date(year, month - 1, day) // local time, no UTC conversion
    while (isNonWorkDay(d, nonWorkDays)) d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

// ── MODAL ─────────────────────────────────────────────────────
function Modal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} style={{ color: 'white' }} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#2c2c2b' }}>{title}</h3>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>{message}</p>
        <button className="btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Got it</button>
      </div>
    </div>
  )
}

// ── CONFIRM ───────────────────────────────────────────────────
function Confirm({ label = 'Delete?', onConfirm, onCancel }: { label?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '11px', color: '#ef4444' }}>{label}</span>
      <button className="btn-ghost" style={{ padding: '2px 4px' }} onClick={onConfirm}><Check size={12} style={{ color: '#ef4444' }} /></button>
      <button className="btn-ghost" style={{ padding: '2px 4px' }} onClick={onCancel}><X size={12} style={{ color: '#6b7280' }} /></button>
    </span>
  )
}

// ── INLINE EDIT ───────────────────────────────────────────────
function InlineEdit({ value, onSave, style }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (editing) {
    return (
      <input autoFocus value={val} onChange={e => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false) } if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
        style={{ fontSize: 'inherit', fontWeight: 'inherit', border: '1px solid #ed1c24', borderRadius: '4px', padding: '2px 6px', outline: 'none', fontFamily: 'inherit', ...style }} />
    )
  }
  return (
    <span onClick={() => setEditing(true)} style={{ cursor: 'text', borderBottom: '1px dashed transparent', ...style }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#d1d5db')}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >{value}</span>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [modal, setModal] = useState<{ title: string; message: string } | null>(null)
  const [editingProject, setEditingProject] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPlannedStart, setEditPlannedStart] = useState('')
  const [editPlannedEnd, setEditPlannedEnd] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  const [showAddComp, setShowAddComp] = useState(false)
  const [newCompName, setNewCompName] = useState('')
  const [confirmDeleteComp, setConfirmDeleteComp] = useState<string | null>(null)
  const [showAddIssue, setShowAddIssue] = useState<string | null>(null)
  const [newIssueName, setNewIssueName] = useState('')
  const [confirmDeleteIssue, setConfirmDeleteIssue] = useState<string | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
      if (error) throw error
      return data as Project
    }
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('project_id', id).order('sort_order')
      if (error) throw error
      return data as Category[]
    }
  })

  const { data: components = [] } = useQuery({
    queryKey: ['components', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('components').select('*').eq('project_id', id).order('sort_order')
      if (error) throw error
      return data as Component[]
    }
  })

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', id],
    queryFn: async () => {
      const compIds = components.map(c => c.id)
      if (compIds.length === 0) return []
      const { data, error } = await supabase.from('issues').select('*').in('component_id', compIds).order('sort_order')
      if (error) throw error
      return data as Issue[]
    },
    enabled: components.length > 0
  })

  const { data: issueFields = [] } = useQuery({
    queryKey: ['issue_fields', id],
    queryFn: async () => {
      const issueIds = issues.map(i => i.id)
      if (issueIds.length === 0) return []
      const { data, error } = await supabase.from('issue_fields').select('*').in('issue_id', issueIds)
      if (error) throw error
      return data as IssueField[]
    },
    enabled: issues.length > 0
  })

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('statuses').select('*').order('sort_order')
      if (error) throw error
      return data as Status[]
    }
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').eq('active', true).order('name')
      if (error) throw error
      return data as Staff[]
    }
  })

  const { data: nonWorkDays = [] } = useQuery({
    queryKey: ['non_work_days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('non_work_days').select('date, type')
      if (error) throw error
      return data as NonWorkDay[]
    }
  })

  // ── HELPERS ───────────────────────────────────────────────
  const getField = useCallback((issueId: string, categoryId: string) =>
    issueFields.find(f => f.issue_id === issueId && f.category_id === categoryId), [issueFields])

  const getStatus = useCallback((statusId: string | null) =>
    statuses.find(s => s.id === statusId), [statuses])

  const notStartedStatus = statuses.find(s => s.name === 'Not Started')
  const completeStatus = statuses.find(s => s.name === 'Complete')

  const isFieldComplete = (field: IssueField) =>
    field.status_id === completeStatus?.id

  const isFieldReady = (field: IssueField) =>
    !!(field.assignee_id && field.lead_time && field.start_date)

  // ── WARNING CHECKS ────────────────────────────────────────
  const hasDateWarning = useCallback((field: IssueField) => {
    if (!project) return false
    if (project.planned_start_date && field.start_date && field.start_date < project.planned_start_date) return true
    if (project.planned_end_date && field.end_date && field.end_date > project.planned_end_date) return true
    return false
  }, [project])

  const issueHasWarning = useCallback((issueId: string) => {
    return issueFields.filter(f => f.issue_id === issueId).some(f => hasDateWarning(f))
  }, [issueFields, hasDateWarning])

  const componentHasWarning = useCallback((componentId: string) => {
    return issues.filter(i => i.component_id === componentId).some(i => issueHasWarning(i.id))
  }, [issues, issueHasWarning])

  const projectHasWarning = components.some(c => componentHasWarning(c.id))

  // ── RECALC DATES ──────────────────────────────────────────
    const handleFieldUpdate = useCallback(async (field: IssueField, updates: Partial<IssueField>) => {
    const updated = { ...field, ...updates }
    if ((updates.lead_time !== undefined || updates.start_date !== undefined) && updated.start_date && updated.lead_time) {
      updated.end_date = addWorkingDays(updated.start_date, updated.lead_time, nonWorkDays)
    }
    // Save the updated field first
    await supabase.from('issue_fields').update(updated).eq('id', field.id)
  
    // Now fetch fresh fields and recalc subsequent categories
    const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    const catIdx = sortedCats.findIndex(c => c.id === field.category_id)
  
    // Fetch all fields for this issue fresh from DB
    const { data: freshFields } = await supabase.from('issue_fields').select('*').eq('issue_id', field.issue_id)
    if (freshFields && catIdx >= 0) {
      for (let i = catIdx + 1; i < sortedCats.length; i++) {
        const cat = sortedCats[i]
        const currentField = freshFields.find(f => f.category_id === cat.id)
        if (!currentField) continue
        const prevCat = sortedCats[i - 1]
        const prevField = freshFields.find(f => f.category_id === prevCat.id)
        if (!prevField?.end_date) continue
        const newStart = nextWorkingDay(prevField.end_date, nonWorkDays)
        const newEnd = currentField.lead_time ? addWorkingDays(newStart, currentField.lead_time, nonWorkDays) : currentField.end_date
        await supabase.from('issue_fields').update({ start_date: newStart, end_date: newEnd }).eq('id', currentField.id)
        // Update freshFields in memory so next iteration uses updated value
        const idx = freshFields.findIndex(f => f.id === currentField.id)
        if (idx >= 0) freshFields[idx] = { ...freshFields[idx], start_date: newStart, end_date: newEnd }
      }
    }
  
    queryClient.invalidateQueries({ queryKey: ['issue_fields', id] })
  }, [categories, nonWorkDays, queryClient, id])

  // ── MUTATIONS ─────────────────────────────────────────────
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const { error } = await supabase.from('projects').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', id] }); setEditingProject(false) }
  })

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('categories').insert({ name, project_id: id, sort_order: categories.length }).select().single()
      if (error) throw error
      if (issues.length > 0) {
        const notStartedId = notStartedStatus?.id
        const fields = issues.map(issue => ({ issue_id: issue.id, category_id: data.id, sort_order: data.sort_order, status_id: notStartedId || null }))
        await supabase.from('issue_fields').insert(fields)
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories', id] }); queryClient.invalidateQueries({ queryKey: ['issue_fields', id] }) }
  })

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ catId, name }: { catId: string; name: string }) => {
      const { error } = await supabase.from('categories').update({ name }).eq('id', catId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', id] })
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (catId: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', catId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories', id] }); queryClient.invalidateQueries({ queryKey: ['issue_fields', id] }) }
  })

  const reorderCategoryMutation = useMutation({
    mutationFn: async ({ catId, direction }: { catId: string; direction: 'up' | 'down' }) => {
      const idx = categories.findIndex(c => c.id === catId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= categories.length) return
      const a = categories[idx]; const b = categories[swapIdx]
      await supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id)
      await supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', id] })
  })

  const addComponentMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('components').insert({ name, project_id: id, sort_order: components.length })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['components', id] })
  })

  const updateComponentMutation = useMutation({
    mutationFn: async ({ compId, name }: { compId: string; name: string }) => {
      const { error } = await supabase.from('components').update({ name }).eq('id', compId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['components', id] })
  })

  const deleteComponentMutation = useMutation({
    mutationFn: async (compId: string) => {
      const { error } = await supabase.from('components').delete().eq('id', compId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['components', id] }); queryClient.invalidateQueries({ queryKey: ['issues', id] }); queryClient.invalidateQueries({ queryKey: ['issue_fields', id] }) }
  })

  const reorderComponentMutation = useMutation({
    mutationFn: async ({ compId, direction }: { compId: string; direction: 'up' | 'down' }) => {
      const idx = components.findIndex(c => c.id === compId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= components.length) return
      const a = components[idx]; const b = components[swapIdx]
      await supabase.from('components').update({ sort_order: b.sort_order }).eq('id', a.id)
      await supabase.from('components').update({ sort_order: a.sort_order }).eq('id', b.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['components', id] })
  })

  const addIssueMutation = useMutation({
    mutationFn: async ({ name, componentId }: { name: string; componentId: string }) => {
      const compIssues = issues.filter(i => i.component_id === componentId)
      const { data, error } = await supabase.from('issues').insert({ name, component_id: componentId, sort_order: compIssues.length }).select().single()
      if (error) throw error
      if (categories.length > 0) {
        const fields = categories.map(cat => ({ issue_id: data.id, category_id: cat.id, sort_order: cat.sort_order, status_id: notStartedStatus?.id || null }))
        await supabase.from('issue_fields').insert(fields)
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues', id] }); queryClient.invalidateQueries({ queryKey: ['issue_fields', id] }) }
  })

  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, name }: { issueId: string; name: string }) => {
      const { error } = await supabase.from('issues').update({ name }).eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues', id] })
  })

  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase.from('issues').delete().eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues', id] }); queryClient.invalidateQueries({ queryKey: ['issue_fields', id] }) }
  })

  const reorderIssueMutation = useMutation({
    mutationFn: async ({ issueId, componentId, direction }: { issueId: string; componentId: string; direction: 'up' | 'down' }) => {
      const compIssues = issues.filter(i => i.component_id === componentId)
      const idx = compIssues.findIndex(i => i.id === issueId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= compIssues.length) return
      const a = compIssues[idx]; const b = compIssues[swapIdx]
      await supabase.from('issues').update({ sort_order: b.sort_order }).eq('id', a.id)
      await supabase.from('issues').update({ sort_order: a.sort_order }).eq('id', b.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues', id] })
  })

  // ── PROGRESS ──────────────────────────────────────────────
  const getIssueProgress = useCallback((issueId: string) => {
    const fields = issueFields.filter(f => f.issue_id === issueId)
    if (fields.length === 0) return 0
    const complete = fields.filter(f => f.status_id === completeStatus?.id).length
    return Math.round((complete / fields.length) * 100)
  }, [issueFields, completeStatus])

  const getComponentProgress = useCallback((componentId: string) => {
    const compIssues = issues.filter(i => i.component_id === componentId)
    if (compIssues.length === 0) return 0
    return Math.round(compIssues.reduce((sum, issue) => sum + getIssueProgress(issue.id), 0) / compIssues.length)
  }, [issues, getIssueProgress])

  const projectProgress = components.length === 0 ? 0 :
    Math.round(components.reduce((sum, comp) => sum + getComponentProgress(comp.id), 0) / components.length)

  // ── FIELD CELL ────────────────────────────────────────────
  function FieldCell({ issueId, category, catIndex }: { issueId: string; category: Category; catIndex: number }) {
    const field = getField(issueId, category.id)
    const [localLeadTime, setLocalLeadTime] = useState(field?.lead_time?.toString() || '')
    const [saving, setSaving] = useState(false)

    const saveField = async (updates: Partial<IssueField>) => {
      if (!field) return
      setSaving(true)
      await handleFieldUpdate(field, updates)
      setSaving(false)
    }

    if (!field) return <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6', verticalAlign: 'top', minWidth: '170px' }} />

    const status = getStatus(field.status_id)
    const isManual = field.start_date_manual
    const hasWarning = hasDateWarning(field)
    const fieldReady = isFieldReady(field)

    const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    const prevCat = catIndex > 0 ? sortedCats[catIndex - 1] : null
    const prevField = prevCat ? getField(issueId, prevCat.id) : null
    const prevComplete = catIndex === 0 || (prevField ? isFieldComplete(prevField) : false)
    const canChangeStatus = fieldReady && prevComplete

    const handleStatusChange = (newStatusId: string) => {
      if (!newStatusId) return
      if (!fieldReady) {
        setModal({ title: 'Fields Required', message: 'Please fill in the Assignee, Lead Time and Start Date before updating the status.' })
        return
      }
      if (!prevComplete) {
        setModal({ title: 'Previous Category Incomplete', message: `The previous category "${prevCat?.name}" must be marked as Complete before you can update this status.` })
        return
      }
      const currentIsComplete = field.status_id === completeStatus?.id
      const nextCat = catIndex < sortedCats.length - 1 ? sortedCats[catIndex + 1] : null
      const nextField = nextCat ? getField(issueId, nextCat.id) : null
      if (currentIsComplete && newStatusId !== completeStatus?.id && nextField?.status_id && nextField.status_id !== notStartedStatus?.id) {
        setModal({ title: 'Next Category Has Progress', message: `The next category "${nextCat?.name}" already has a status set. Please clear it first before changing this category's status.` })
        return
      }
      saveField({ status_id: newStatusId })
    }

    return (
      <td style={{ padding: '8px', borderRight: '1px solid #f3f4f6', verticalAlign: 'top', minWidth: '170px', background: hasWarning ? '#fff9f9' : 'white', position: 'relative' }}>
        {saving && (
  <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
    <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
  </div>
)}



        {/* Assignee */}
        <div style={{ marginBottom: '6px' }}>
          <select value={field.assignee_id || ''} onChange={e => saveField({ assignee_id: e.target.value || null })}
            style={{ width: '100%', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '3px 6px', outline: 'none', fontFamily: 'inherit', color: field.assignee_id ? '#2c2c2b' : '#9ca3af' }}>
            <option value="">— Assignee —</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Lead Time */}
        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="number" min="1" placeholder="Lead time" value={localLeadTime}
            onChange={e => setLocalLeadTime(e.target.value)}
            onBlur={() => { const lt = parseInt(localLeadTime); if (!isNaN(lt) && lt > 0) saveField({ lead_time: lt }) }}
            onKeyDown={e => { if (e.key === 'Enter') { const lt = parseInt(localLeadTime); if (!isNaN(lt) && lt > 0) saveField({ lead_time: lt }) } }}
            style={{ width: '70px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '3px 6px', outline: 'none', fontFamily: 'inherit' }} />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>days</span>
        </div>

        {/* Start Date */}
        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="date"
            defaultValue={field.start_date || ''}
            key={field.start_date || ''}
            onBlur={e => {
              let dateVal = e.target.value
              if (!dateVal) return
              dateVal = advanceToWorkingDay(dateVal, nonWorkDays)
              if (project?.planned_start_date && dateVal < project.planned_start_date) {
                setModal({ title: 'Date Out of Range', message: `This date is before the project planned start date (${formatDate(project.planned_start_date)}). Please choose a date within the project range.` })
                return
              }
              if (project?.planned_end_date && dateVal > project.planned_end_date) {
                setModal({ title: 'Date Out of Range', message: `This date is after the project planned end date (${formatDate(project.planned_end_date)}). Please choose a date within the project range.` })
                return
              }
              if (prevField?.end_date && dateVal <= prevField.end_date) {
                setModal({ title: 'Invalid Date', message: `The start date must be after the end date of "${prevCat?.name}" (${formatDate(prevField.end_date)}).` })
                return
              }
              saveField({ start_date: dateVal, start_date_manual: true })
            }}
            style={{
              fontSize: '11px',
              border: `1px solid ${isManual ? '#fcaf17' : hasWarning ? '#ef4444' : '#e5e7eb'}`,
              borderRadius: '4px', padding: '2px 4px', outline: 'none', fontFamily: 'inherit', width: '100%'
            }}
          />
          {isManual && <span title="Manually set" style={{ fontSize: '10px', color: '#fcaf17' }}>M</span>}
        </div>

        {/* End Date */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', padding: '3px 4px', borderRadius: '4px', border: '1px solid #f3f4f6', background: hasWarning ? '#fef2f2' : '#f9fafb', color: hasWarning ? '#ef4444' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {field.end_date ? formatDate(field.end_date) : '—'}
            {hasWarning && <span>⚠️</span>}
          </div>
        </div>

        {/* Status */}
        <div>
          <select value={field.status_id || ''} onChange={e => handleStatusChange(e.target.value)}
            disabled={!canChangeStatus}
            title={!fieldReady ? 'Fill in Assignee, Lead Time and Start Date first' : !prevComplete ? 'Previous category must be Complete first' : ''}
            style={{ width: '100%', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '3px 6px', outline: 'none', fontFamily: 'inherit', background: status ? status.colour + '22' : 'white', color: status ? status.colour : '#9ca3af', fontWeight: status ? '500' : '400', opacity: canChangeStatus ? 1 : 0.5, cursor: canChangeStatus ? 'pointer' : 'not-allowed' }}>
            <option value="">— Status —</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </td>
    )
  }

  if (!project) return <div className="spinner-wrap"><div className="spinner" /></div>

  return (
    <div>
      {modal && <Modal title={modal.title} message={modal.message} onClose={() => setModal(null)} />}

      {/* Back */}
      <button className="btn-ghost" onClick={() => navigate(`/departments/${project.department_id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
        <ArrowLeft size={16} /> Back to Department
      </button>

      {/* Project Header */}
      <div style={{ background: 'white', border: `1px solid ${projectHasWarning ? '#fca5a5' : '#e5e7eb'}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
        {editingProject ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              style={{ fontSize: '20px', fontWeight: '700', border: '1px solid #ed1c24', borderRadius: '8px', padding: '6px 12px', outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Planned Start</label>
                <input type="date" value={editPlannedStart} onChange={e => setEditPlannedStart(e.target.value)}
                  style={{ fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280' }}>Planned End</label>
                <input type="date" value={editPlannedEnd} onChange={e => setEditPlannedEnd(e.target.value)}
                  style={{ fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={() => updateProjectMutation.mutate({ name: editName, planned_start_date: editPlannedStart || null, planned_end_date: editPlannedEnd || null })}>Save</button>
              <button className="btn-secondary" onClick={() => setEditingProject(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#2c2c2b' }}>{project.name}</h1>
                {projectHasWarning && <AlertTriangle size={18} style={{ color: '#ef4444' }} />}
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  <span style={{ fontWeight: '500', color: '#2c2c2b' }}>Planned: </span>
                  {formatDate(project.planned_start_date)} → {formatDate(project.planned_end_date)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  <span style={{ fontWeight: '500', color: '#2c2c2b' }}>Progress: </span>
                  <span style={{ color: '#ed1c24', fontWeight: '600' }}>{projectProgress}%</span>
                </div>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => { setEditName(project.name); setEditPlannedStart(project.planned_start_date || ''); setEditPlannedEnd(project.planned_end_date || ''); setEditingProject(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Settings2 size={14} /> Edit Project
            </button>
          </div>
        )}
      </div>

      {/* Categories Bar */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px' }}>Categories:</span>
        {categories.map((cat, i) => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', borderRadius: '6px', padding: '4px 8px' }}>
            <button className="btn-ghost" style={{ padding: '1px 2px' }} onClick={() => reorderCategoryMutation.mutate({ catId: cat.id, direction: 'up' })} disabled={i === 0}><ChevronUp size={11} /></button>
            <InlineEdit value={cat.name} onSave={name => updateCategoryMutation.mutate({ catId: cat.id, name })} style={{ fontSize: '13px', fontWeight: '500' }} />
            <button className="btn-ghost" style={{ padding: '1px 2px' }} onClick={() => reorderCategoryMutation.mutate({ catId: cat.id, direction: 'down' })} disabled={i === categories.length - 1}><ChevronDown size={11} /></button>
            {confirmDeleteCat === cat.id
              ? <Confirm onConfirm={() => deleteCategoryMutation.mutate(cat.id)} onCancel={() => setConfirmDeleteCat(null)} />
              : <button className="btn-ghost" style={{ padding: '1px 2px' }} onClick={() => setConfirmDeleteCat(cat.id)}><X size={11} style={{ color: '#ef4444' }} /></button>
            }
          </div>
        ))}
        {showAddCat ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name..."
              onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) { addCategoryMutation.mutate(newCatName.trim()); setNewCatName(''); setShowAddCat(false) } if (e.key === 'Escape') { setShowAddCat(false); setNewCatName('') } }}
              style={{ fontSize: '13px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit' }} />
            <button className="btn-ghost" onClick={() => { if (newCatName.trim()) { addCategoryMutation.mutate(newCatName.trim()); setNewCatName(''); setShowAddCat(false) } }}><Check size={13} style={{ color: '#10b981' }} /></button>
            <button className="btn-ghost" onClick={() => { setShowAddCat(false); setNewCatName('') }}><X size={13} /></button>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => setShowAddCat(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#ed1c24', border: '1px dashed #ed1c24', borderRadius: '6px', padding: '4px 10px' }}>
            <Plus size={13} /> Add Category
          </button>
        )}
      </div>

      {/* Components */}
      {components.length === 0 && !showAddComp ? (
        <div className="empty-state"><p>No components yet</p><span>Add your first component to get started</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {components.map((comp, compIdx) => {
            const compIssues = issues.filter(i => i.component_id === comp.id)
            const compProgress = getComponentProgress(comp.id)
            const compWarning = componentHasWarning(comp.id)

            return (
              <div key={comp.id} style={{ background: 'white', border: `1px solid ${compWarning ? '#fca5a5' : '#e5e7eb'}`, borderRadius: '12px', overflow: 'hidden' }}>
                {/* Component Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderComponentMutation.mutate({ compId: comp.id, direction: 'up' })} disabled={compIdx === 0}><ChevronUp size={12} /></button>
                    <button className="btn-ghost" style={{ padding: '1px 3px' }} onClick={() => reorderComponentMutation.mutate({ compId: comp.id, direction: 'down' })} disabled={compIdx === components.length - 1}><ChevronDown size={12} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <InlineEdit value={comp.name} onSave={name => updateComponentMutation.mutate({ compId: comp.id, name })} style={{ fontSize: '14px', fontWeight: '600', color: '#2c2c2b' }} />
                    {compWarning && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '4px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${compProgress}%` }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px' }}>{compProgress}%</span>
                  </div>
                  {confirmDeleteComp === comp.id
                    ? <Confirm label="Delete?" onConfirm={() => deleteComponentMutation.mutate(comp.id)} onCancel={() => setConfirmDeleteComp(null)} />
                    : <button className="btn-ghost" onClick={() => setConfirmDeleteComp(comp.id)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                  }
                </div>

                {/* Issues Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #f3f4f6', minWidth: '200px', position: 'sticky', left: 0, background: '#fafafa', zIndex: 1 }}>Issue</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #f3f4f6', minWidth: '60px' }}>Progress</th>
                        {categories.map(cat => (
                          <th key={cat.id} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#2c2c2b', borderRight: '1px solid #f3f4f6', minWidth: '170px' }}>{cat.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compIssues.map((issue, issueIdx) => {
                        const issueProgress = getIssueProgress(issue.id)
                        const issueWarning = issueHasWarning(issue.id)
                        const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order)
                        return (
                          <tr key={issue.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px', borderRight: '1px solid #f3f4f6', verticalAlign: 'middle', position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <button className="btn-ghost" style={{ padding: '1px 2px' }} onClick={() => reorderIssueMutation.mutate({ issueId: issue.id, componentId: comp.id, direction: 'up' })} disabled={issueIdx === 0}><ChevronUp size={11} /></button>
                                  <button className="btn-ghost" style={{ padding: '1px 2px' }} onClick={() => reorderIssueMutation.mutate({ issueId: issue.id, componentId: comp.id, direction: 'down' })} disabled={issueIdx === compIssues.length - 1}><ChevronDown size={11} /></button>
                                </div>
                                <InlineEdit value={issue.name} onSave={name => updateIssueMutation.mutate({ issueId: issue.id, name })} style={{ fontSize: '13px' }} />
                                {issueWarning && <AlertTriangle size={12} style={{ color: '#ef4444', flexShrink: 0 }} />}
                                {confirmDeleteIssue === issue.id
                                  ? <Confirm label="Delete?" onConfirm={() => deleteIssueMutation.mutate(issue.id)} onCancel={() => setConfirmDeleteIssue(null)} />
                                  : <button className="btn-ghost" onClick={() => setConfirmDeleteIssue(issue.id)}><Trash2 size={12} style={{ color: '#ef4444' }} /></button>
                                }
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', borderRight: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '40px', height: '4px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${issueProgress}%` }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#2c2c2b' }}>{issueProgress}%</span>
                              </div>
                            </td>
                            {sortedCats.map((cat, catIndex) => (
                              <FieldCell key={cat.id} issueId={issue.id} category={cat} catIndex={catIndex} />
                            ))}
                          </tr>
                        )
                      })}
                      <tr style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td colSpan={categories.length + 2} style={{ padding: '8px 12px' }}>
                          {showAddIssue === comp.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input autoFocus value={newIssueName} onChange={e => setNewIssueName(e.target.value)} placeholder="Issue name..."
                                onKeyDown={e => { if (e.key === 'Enter' && newIssueName.trim()) { addIssueMutation.mutate({ name: newIssueName.trim(), componentId: comp.id }); setNewIssueName(''); setShowAddIssue(null) } if (e.key === 'Escape') { setShowAddIssue(null); setNewIssueName('') } }}
                                style={{ fontSize: '13px', border: '1px solid #ed1c24', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: 'inherit', minWidth: '200px' }} />
                              <button className="btn-ghost" onClick={() => { if (newIssueName.trim()) { addIssueMutation.mutate({ name: newIssueName.trim(), componentId: comp.id }); setNewIssueName(''); setShowAddIssue(null) } }}><Check size={13} style={{ color: '#10b981' }} /></button>
                              <button className="btn-ghost" onClick={() => { setShowAddIssue(null); setNewIssueName('') }}><X size={13} /></button>
                            </div>
                          ) : (
                            <button className="btn-ghost" onClick={() => setShowAddIssue(comp.id)} style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Plus size={13} /> Add Issue
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Component */}
      <div style={{ marginTop: '16px' }}>
        {showAddComp ? (
          <div className="add-form">
            <input autoFocus value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="Component name..."
              onKeyDown={e => { if (e.key === 'Enter' && newCompName.trim()) { addComponentMutation.mutate(newCompName.trim()); setNewCompName(''); setShowAddComp(false) } if (e.key === 'Escape') { setShowAddComp(false); setNewCompName('') } }}
              style={{ minWidth: '200px' }} />
            <button className="btn-primary" onClick={() => { if (newCompName.trim()) { addComponentMutation.mutate(newCompName.trim()); setNewCompName(''); setShowAddComp(false) } }} disabled={!newCompName.trim()}>Add</button>
            <button className="btn-ghost" onClick={() => { setShowAddComp(false); setNewCompName('') }}>Cancel</button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setShowAddComp(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Plus size={15} /> Add Component
          </button>
        )}
      </div>
    </div>
  )
}