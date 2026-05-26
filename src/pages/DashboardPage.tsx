import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AlertTriangle, TrendingUp, FolderOpen, Building2, Users, Filter, X } from 'lucide-react'

// ── TYPES ─────────────────────────────────────────────────────
interface Department { id: string; name: string; archived: boolean; deleted_at: string | null }
interface Project { id: string; department_id: string; name: string; planned_start_date: string | null; planned_end_date: string | null; archived: boolean; deleted_at: string | null }
interface Component { id: string; project_id: string }
interface Issue { id: string; component_id: string }
interface IssueField { id: string; issue_id: string; assignee_id: string | null; status_id: string | null; start_date: string | null; end_date: string | null }
interface Staff { id: string; name: string; type: 'internal' | 'freelancer'; active: boolean }
interface Status { id: string; name: string; colour: string }

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('T')[0].split('-')
  return `${year}/${month}/${day}`
}

export default function DashboardPage() {
  const [filterDept, setFilterDept] = useState<string[]>([])
  const [filterStaff, setFilterStaff] = useState<string[]>([])
  const [filterFreelancer, setFilterFreelancer] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [filterProject, setFilterProject] = useState<string[]>([])

  useEffect(() => {
    const handleClick = () => setOpenDropdown(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const { data: departments = [] } = useQuery({
    queryKey: ['dash-departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('archived', false).is('deleted_at', null).order('name')
      return (data || []) as Department[]
    }
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['dash-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').eq('archived', false).is('deleted_at', null)
      return (data || []) as Project[]
    }
  })

  const { data: components = [] } = useQuery({
    queryKey: ['dash-components'],
    queryFn: async () => {
      const { data } = await supabase.from('components').select('id, project_id')
      return (data || []) as Component[]
    }
  })

  const { data: issues = [] } = useQuery({
    queryKey: ['dash-issues'],
    queryFn: async () => {
      const { data } = await supabase.from('issues').select('id, component_id')
      return (data || []) as Issue[]
    }
  })

  const { data: issueFields = [] } = useQuery({
    queryKey: ['dash-issue-fields'],
    queryFn: async () => {
      const { data } = await supabase.from('issue_fields').select('id, issue_id, assignee_id, status_id, start_date, end_date')
      return (data || []) as IssueField[]
    }
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['dash-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('*').eq('active', true).order('name')
      return (data || []) as Staff[]
    }
  })

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('sort_order')
      return (data || []) as Status[]
    }
  })

  // ── LOOKUPS ───────────────────────────────────────────────
  const compToProject: Record<string, string> = {}
  components.forEach(c => { compToProject[c.id] = c.project_id })
  const issueToComp: Record<string, string> = {}
  issues.forEach(i => { issueToComp[i.id] = i.component_id })
  const issueToProject = (issueId: string) => compToProject[issueToComp[issueId]]

  const completeStatus = statuses.find(s => s.name === 'Complete')
  const notStartedStatus = statuses.find(s => s.name === 'Not Started')

  // ── PROGRESS CALC ─────────────────────────────────────────
  const getProjectProgress = (projectId: string) => {
    const projComps = components.filter(c => c.project_id === projectId)
    if (projComps.length === 0) return 0
    const projIssues = issues.filter(i => projComps.some(c => c.id === i.component_id))
    if (projIssues.length === 0) return 0
    let total = 0; let complete = 0
    projIssues.forEach(issue => {
      const fields = issueFields.filter(f => f.issue_id === issue.id)
      total += fields.length
      complete += fields.filter(f => f.status_id === completeStatus?.id).length
    })
    return total > 0 ? Math.round((complete / total) * 100) : 0
  }

  const getDeptProgress = (deptId: string) => {
    const deptProjects = projects.filter(p => p.department_id === deptId)
    if (deptProjects.length === 0) return 0
    const total = deptProjects.reduce((sum, p) => sum + getProjectProgress(p.id), 0)
    return Math.round(total / deptProjects.length)
  }

  // ── ACTUAL DATES ──────────────────────────────────────────
  const getProjectActualDates = (projectId: string) => {
    const projComps = components.filter(c => c.project_id === projectId)
    const projIssues = issues.filter(i => projComps.some(c => c.id === i.component_id))
    const fields = issueFields.filter(f => projIssues.some(i => i.id === f.issue_id))
    let start: string | null = null; let end: string | null = null
    fields.forEach(f => {
      if (f.start_date && (!start || f.start_date < start)) start = f.start_date
      if (f.end_date && (!end || f.end_date > end)) end = f.end_date
    })
    return { start, end }
  }

  // ── PROJECT STATUS LABEL ──────────────────────────────────
  const getProjectStatus = (projectId: string) => {
    const progress = getProjectProgress(projectId)
    if (progress === 100) return { label: 'Complete', colour: '#16a34a', bg: '#f0fdf4' }
    if (progress > 0) return { label: 'In Progress', colour: '#0066b3', bg: '#dbeafe' }
    return { label: 'Not Started', colour: '#6b7280', bg: '#f3f4f6' }
  }

  // ── DATE FILTER HELPER ────────────────────────────────────
  const projectInDateRange = (project: Project) => {
    if (!filterDateFrom && !filterDateTo) return true
    const dates = getProjectActualDates(project.id)
    const planned = [project.planned_start_date, project.planned_end_date]
    const actual = [dates.start, dates.end]
    const allDates = [...planned, ...actual].filter(Boolean) as string[]
    if (allDates.length === 0) return true
    if (filterDateFrom && allDates.every(d => d < filterDateFrom)) return false
    if (filterDateTo && allDates.every(d => d > filterDateTo)) return false
    return true
  }

  // ── FILTERED PROJECTS ─────────────────────────────────────
  const filteredProjects = projects.filter(p => {
    if (filterDept.length > 0 && !filterDept.includes(p.department_id)) return false
    if (filterProject.length > 0 && !filterProject.includes(p.id)) return false
    if (!projectInDateRange(p)) return false
    if (filterStaff.length > 0 || filterFreelancer.length > 0) {
      const allStaffFilter = [...filterStaff, ...filterFreelancer]
      const projComps = components.filter(c => c.project_id === p.id)
      const projIssues = issues.filter(i => projComps.some(c => c.id === i.component_id))
      const projFields = issueFields.filter(f => projIssues.some(i => i.id === f.issue_id))
      if (!projFields.some(f => f.assignee_id && allStaffFilter.includes(f.assignee_id))) return false
    }
    if (filterStatus.length > 0) {
      const status = getProjectStatus(p.id)
      const statusMatch = filterStatus.some(s => {
        if (s === 'complete') return status.label === 'Complete'
        if (s === 'inprogress') return status.label === 'In Progress'
        if (s === 'notstarted') return status.label === 'Not Started'
        return false
      })
      if (!statusMatch) return false
    }
    return true
  })

  const filteredDepts = departments.filter(d => filteredProjects.some(p => p.department_id === d.id) || filterDept.includes(d.id))

  // ── SUMMARY STATS ─────────────────────────────────────────
  const totalProgress = filteredProjects.length > 0
    ? Math.round(filteredProjects.reduce((sum, p) => sum + getProjectProgress(p.id), 0) / filteredProjects.length)
    : 0
  const inProgress = filteredProjects.filter(p => getProjectStatus(p.id).label === 'In Progress').length
  const notStarted = filteredProjects.filter(p => getProjectStatus(p.id).label === 'Not Started').length
  const complete = filteredProjects.filter(p => getProjectStatus(p.id).label === 'Complete').length

  const internalStaff = staff.filter(s => s.type === 'internal')
  const freelancers = staff.filter(s => s.type === 'freelancer')

  const hasFilters = filterDept.length > 0 || filterStaff.length > 0 || filterFreelancer.length > 0 || filterStatus.length > 0 || filterProject.length > 0 || filterDateFrom || filterDateTo

  // ── FILTER DROPDOWN COMPONENT ─────────────────────────────
  function FilterDropdown({ id, label, options, selected, onChange }: {
    id: string; label: string
    options: { value: string; label: string }[]
    selected: string[]
    onChange: (val: string[]) => void
  }) {
    return (
      <div style={{ position: 'relative' }}>
        <button onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === id ? null : id) }}
          style={{ padding: '6px 12px', fontSize: '13px', border: `1px solid ${selected.length > 0 ? '#ed1c24' : '#e5e7eb'}`, borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {label} {selected.length > 0 && <span style={{ background: '#ed1c24', color: 'white', borderRadius: '20px', padding: '0 6px', fontSize: '11px' }}>{selected.length}</span>}
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
        </button>
        {openDropdown === id && (
          <div style={{ position: 'absolute', top: '36px', left: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '180px', padding: '4px 0' }}>
            {options.map(opt => (
              <label key={opt.value} onClick={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#2c2c2b' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <input type="checkbox" checked={selected.includes(opt.value)}
                  onChange={e => onChange(e.target.checked ? [...selected, opt.value] : selected.filter(v => v !== opt.value))} />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of all departments and projects</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2c2c2b', fontSize: '13px', fontWeight: '600' }}>
            <Filter size={14} /> Filter by
          </div>
          <FilterDropdown id="dept" label="Department" selected={filterDept} onChange={setFilterDept}
            options={departments.map(d => ({ value: d.id, label: d.name }))} />
            <FilterDropdown id="project" label="Project" selected={filterProject} onChange={setFilterProject}
  options={projects.map(p => ({ value: p.id, label: p.name }))} />
          <FilterDropdown id="status" label="Status" selected={filterStatus} onChange={setFilterStatus}
            options={[{ value: 'notstarted', label: 'Not Started' }, { value: 'inprogress', label: 'In Progress' }, { value: 'complete', label: 'Complete' }]} />
          <FilterDropdown id="staff" label="Staff" selected={filterStaff} onChange={setFilterStaff}
            options={internalStaff.map(s => ({ value: s.id, label: s.name }))} />
          <FilterDropdown id="freelancer" label="Freelancer" selected={filterFreelancer} onChange={setFilterFreelancer}
            options={freelancers.map(s => ({ value: s.id, label: s.name }))} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#2c2c2b', fontWeight: '500' }}>From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#2c2c2b', fontWeight: '500' }}>To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', color: '#2c2c2b' }} />
          </div>
          {hasFilters && (
            <button className="btn-ghost" onClick={() => { setFilterDept([]); setFilterStaff([]); setFilterFreelancer([]); setFilterStatus([]); setFilterProject([]); setFilterDateFrom(''); setFilterDateTo('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#ef4444' }}>
              <X size={13} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Projects', value: filteredProjects.length, sub: `across ${new Set(filteredProjects.map(p => p.department_id)).size} department(s)`, color: '#ed1c24', icon: FolderOpen },
          { label: 'Overall Progress', value: `${totalProgress}%`, sub: `${complete} complete`, color: '#008745', icon: TrendingUp },
          { label: 'In Progress', value: inProgress, sub: 'projects active', color: '#0066b3', icon: TrendingUp },
          { label: 'Not Started', value: notStarted, sub: 'projects pending', color: '#fcaf17', icon: FolderOpen },
          { label: 'Complete', value: complete, sub: 'projects done', color: '#008745', icon: TrendingUp },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', borderTop: `3px solid ${card.color}` }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#2c2c2b', marginBottom: '4px' }}>{card.value}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>{card.sub}</p>
            {card.label === 'Overall Progress' && (
              <div style={{ height: '4px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden', marginTop: '8px' }}>
                <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${totalProgress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Department Overview */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={16} style={{ color: '#6b7280' }} />
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#2c2c2b' }}>Department Overview</h2>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{filteredDepts.length} departments</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 160px', gap: '12px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['Department', 'Projects', 'Complete', 'In Progress', 'Not Started', 'Progress'].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {filteredDepts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No departments match the current filters</div>
        ) : filteredDepts.map((dept, i) => {
          const deptProjects = filteredProjects.filter(p => p.department_id === dept.id)
          const deptProgress = getDeptProgress(dept.id)
          const deptComplete = deptProjects.filter(p => getProjectStatus(p.id).label === 'Complete').length
          const deptInProgress = deptProjects.filter(p => getProjectStatus(p.id).label === 'In Progress').length
          const deptNotStarted = deptProjects.filter(p => getProjectStatus(p.id).label === 'Not Started').length
          const hasWarning = deptProjects.some(p => {
            const dates = getProjectActualDates(p.id)
            return !!(p.planned_end_date && dates.end && (dates.end as string) > (p.planned_end_date as string))
          })
          return (
            <div key={dept.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 160px', gap: '12px', padding: '12px 20px', borderBottom: i < filteredDepts.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#2c2c2b' }}>{dept.name}</span>
                {hasWarning && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
              </div>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{deptProjects.length}</span>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>{deptComplete}</span>
              <span style={{ fontSize: '13px', color: '#0066b3', fontWeight: '500' }}>{deptInProgress}</span>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{deptNotStarted}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${deptProgress}%` }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px' }}>{deptProgress}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Project Detail */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpen size={16} style={{ color: '#6b7280' }} />
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#2c2c2b' }}>Project Detail</h2>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{filteredProjects.length} projects</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px 110px 110px 110px 150px 100px', gap: '12px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['Project', 'Department', 'Planned Start', 'Planned End', 'Actual Start', 'Actual End', 'Progress', 'Status'].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {filteredProjects.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No projects match the current filters</div>
        ) : filteredProjects.map((project, i) => {
          const dept = departments.find(d => d.id === project.department_id)
          const progress = getProjectProgress(project.id)
          const status = getProjectStatus(project.id)
          const actual = getProjectActualDates(project.id)
          return (
            <div key={project.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px 110px 110px 110px 150px 100px', gap: '12px', padding: '12px 20px', borderBottom: i < filteredProjects.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#2c2c2b' }}>{project.name}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{dept?.name || '—'}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(project.planned_start_date)}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(project.planned_end_date)}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(actual.start)}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatDate(actual.end)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${progress}%` }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px' }}>{progress}%</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: status.bg, color: status.colour }}>
                {status.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Staff Workload */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} style={{ color: '#6b7280' }} />
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#2c2c2b' }}>Staff Workload</h2>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{staff.length} staff members</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px 160px', gap: '12px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['Staff Member', 'Type', 'Assigned', 'Complete', 'In Progress', 'Workload'].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {staff.filter(s => {
          if (filterStaff.length > 0 && s.type === 'internal' && !filterStaff.includes(s.id)) return false
          if (filterFreelancer.length > 0 && s.type === 'freelancer' && !filterFreelancer.includes(s.id)) return false
          return true
        }).map((member, i, arr) => {
          const assignedFields = issueFields.filter(f => {
            if (f.assignee_id !== member.id) return false
            const projId = issueToProject(f.issue_id)
            return filteredProjects.some(p => p.id === projId)
          })
          const completeFields = assignedFields.filter(f => f.status_id === completeStatus?.id)
          const inProgressFields = assignedFields.filter(f => f.status_id && f.status_id !== completeStatus?.id && f.status_id !== notStartedStatus?.id)
          const workload = assignedFields.length > 0 ? Math.round((completeFields.length / assignedFields.length) * 100) : 0
          return (
            <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px 160px', gap: '12px', padding: '12px 20px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: member.type === 'internal' ? '#dbeafe' : '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: member.type === 'internal' ? '#1d4ed8' : '#be185d', flexShrink: 0 }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#2c2c2b' }}>{member.name}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', background: member.type === 'internal' ? '#dbeafe' : '#fce7f3', color: member.type === 'internal' ? '#1d4ed8' : '#be185d', display: 'inline-block' }}>
                {member.type === 'internal' ? 'Staff' : 'Freelancer'}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{assignedFields.length}</span>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>{completeFields.length}</span>
              <span style={{ fontSize: '13px', color: '#0066b3', fontWeight: '500' }}>{inProgressFields.length}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(to right, #ed1c24, #fcaf17)', width: `${workload}%` }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#2c2c2b', minWidth: '32px' }}>{workload}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}