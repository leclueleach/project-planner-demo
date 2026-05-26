import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'demo' } }
)

export default async function handler(req: any, res: any) {
  // Verify this is called from Vercel cron
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Delete all data in correct order
    await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('issue_fields').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('issues').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('components').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('departments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('non_work_days').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('reset_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Re-insert demo data
    await insertDemoData()

    return res.status(200).json({ success: true, reset_at: new Date().toISOString() })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}

async function insertDemoData() {
  // Statuses
  await supabase.from('statuses').insert([
    { name: 'Not Started', colour: '#6b7280', sort_order: 1, is_system: true },
    { name: 'In Progress', colour: '#0066b3', sort_order: 2, is_system: false },
    { name: 'In Review', colour: '#fcaf17', sort_order: 3, is_system: false },
    { name: 'Complete', colour: '#008745', sort_order: 4, is_system: true },
    { name: 'On Hold', colour: '#b45309', sort_order: 5, is_system: false },
    { name: 'Blocked', colour: '#ed1c24', sort_order: 6, is_system: false },
  ])

  // Non work days
  await supabase.from('non_work_days').insert([
    { date: '2026-01-01', name: "New Year's Day", type: 'public_holiday' },
    { date: '2026-03-21', name: 'Human Rights Day', type: 'public_holiday' },
    { date: '2026-04-03', name: 'Good Friday', type: 'public_holiday' },
    { date: '2026-04-06', name: 'Family Day', type: 'public_holiday' },
    { date: '2026-04-27', name: 'Freedom Day', type: 'public_holiday' },
    { date: '2026-05-01', name: 'Workers Day', type: 'public_holiday' },
    { date: '2026-06-16', name: 'Youth Day', type: 'public_holiday' },
    { date: '2026-08-10', name: "National Women's Day", type: 'public_holiday' },
    { date: '2026-09-24', name: 'Heritage Day', type: 'public_holiday' },
    { date: '2026-12-16', name: 'Day of Reconciliation', type: 'public_holiday' },
    { date: '2026-12-25', name: 'Christmas Day', type: 'public_holiday' },
    { date: '2026-12-26', name: 'Day of Goodwill', type: 'public_holiday' },
    { date: '2026-12-24', name: 'Christmas Eve', type: 'company_holiday' },
    { date: '2026-12-31', name: "New Year's Eve", type: 'company_holiday' },
  ])

  // Staff
  const { data: staffData } = await supabase.from('staff').insert([
    { name: 'Sarah Johnson', email: 'sarah@demo.com', type: 'internal', active: true },
    { name: 'Michael Chen', email: 'michael@demo.com', type: 'internal', active: true },
    { name: 'Emily Davis', email: 'emily@demo.com', type: 'internal', active: true },
    { name: 'James Wilson', email: 'james@demo.com', type: 'internal', active: true },
    { name: 'Lisa Thompson', email: 'lisa@demo.com', type: 'freelancer', active: true },
    { name: 'David Martinez', email: 'david@demo.com', type: 'freelancer', active: true },
    { name: 'Anna Kowalski', email: 'anna@demo.com', type: 'freelancer', active: true },
  ]).select()

  // Demo user
  await supabase.from('app_users').insert({
    name: 'Demo User', email: 'demo@projectplanner.com', role: 'admin', status: 'active'
  })

  // Get staff IDs
  const sarah = staffData?.find((s: any) => s.name === 'Sarah Johnson')?.id
  const michael = staffData?.find((s: any) => s.name === 'Michael Chen')?.id
  const emily = staffData?.find((s: any) => s.name === 'Emily Davis')?.id
  const james = staffData?.find((s: any) => s.name === 'James Wilson')?.id
  const lisa = staffData?.find((s: any) => s.name === 'Lisa Thompson')?.id
  const david = staffData?.find((s: any) => s.name === 'David Martinez')?.id
  const anna = staffData?.find((s: any) => s.name === 'Anna Kowalski')?.id

  const { data: statusData } = await supabase.from('statuses').select('id, name')
  const notStarted = statusData?.find((s: any) => s.name === 'Not Started')?.id
  const inProgress = statusData?.find((s: any) => s.name === 'In Progress')?.id
  const inReview = statusData?.find((s: any) => s.name === 'In Review')?.id
  const complete = statusData?.find((s: any) => s.name === 'Complete')?.id
  const onHold = statusData?.find((s: any) => s.name === 'On Hold')?.id

  // Departments
  const { data: deptData } = await supabase.from('departments').insert([
    { name: 'Marketing', sort_order: 0 },
    { name: 'Product Development', sort_order: 1 },
    { name: 'Operations', sort_order: 2 },
    { name: 'Human Resources', sort_order: 3 },
  ]).select()

  const marketing = deptData?.find((d: any) => d.name === 'Marketing')?.id
  const product = deptData?.find((d: any) => d.name === 'Product Development')?.id
  const operations = deptData?.find((d: any) => d.name === 'Operations')?.id
  const hr = deptData?.find((d: any) => d.name === 'Human Resources')?.id

  // Projects
  const { data: projData } = await supabase.from('projects').insert([
    { department_id: marketing, name: 'Brand Refresh 2026', planned_start_date: '2026-01-05', planned_end_date: '2026-04-30', sort_order: 0 },
    { department_id: marketing, name: 'Social Media Campaign Q2', planned_start_date: '2026-03-01', planned_end_date: '2026-06-30', sort_order: 1 },
    { department_id: product, name: 'Mobile App v2.0', planned_start_date: '2026-01-12', planned_end_date: '2026-07-31', sort_order: 0 },
    { department_id: product, name: 'API Integration Suite', planned_start_date: '2026-04-01', planned_end_date: '2026-09-30', sort_order: 1 },
    { department_id: operations, name: 'Office Relocation', planned_start_date: '2026-02-01', planned_end_date: '2026-05-31', sort_order: 0 },
    { department_id: hr, name: 'Staff Training Programme', planned_start_date: '2026-03-01', planned_end_date: '2026-08-31', sort_order: 0 },
  ]).select()

  const brandRefresh = projData?.find((p: any) => p.name === 'Brand Refresh 2026')?.id
  const mobileApp = projData?.find((p: any) => p.name === 'Mobile App v2.0')?.id

  // Categories for Brand Refresh
  const { data: catData } = await supabase.from('categories').insert([
    { project_id: brandRefresh, name: 'Briefing', sort_order: 0 },
    { project_id: brandRefresh, name: 'Design', sort_order: 1 },
    { project_id: brandRefresh, name: 'Review', sort_order: 2 },
    { project_id: brandRefresh, name: 'Delivery', sort_order: 3 },
  ]).select()

  const briefing = catData?.find((c: any) => c.name === 'Briefing')?.id
  const design = catData?.find((c: any) => c.name === 'Design')?.id
  const review = catData?.find((c: any) => c.name === 'Review')?.id
  const delivery = catData?.find((c: any) => c.name === 'Delivery')?.id

  // Categories for Mobile App
  const { data: catData2 } = await supabase.from('categories').insert([
    { project_id: mobileApp, name: 'Planning', sort_order: 0 },
    { project_id: mobileApp, name: 'Development', sort_order: 1 },
    { project_id: mobileApp, name: 'Testing', sort_order: 2 },
    { project_id: mobileApp, name: 'Launch', sort_order: 3 },
  ]).select()

  const planning = catData2?.find((c: any) => c.name === 'Planning')?.id
  const development = catData2?.find((c: any) => c.name === 'Development')?.id
  const testing = catData2?.find((c: any) => c.name === 'Testing')?.id
  const launch = catData2?.find((c: any) => c.name === 'Launch')?.id

  // Components
  const { data: compData } = await supabase.from('components').insert([
    { project_id: brandRefresh, name: 'Logo & Identity', sort_order: 0 },
    { project_id: brandRefresh, name: 'Marketing Collateral', sort_order: 1 },
    { project_id: mobileApp, name: 'Authentication Module', sort_order: 0 },
    { project_id: mobileApp, name: 'Dashboard & Analytics', sort_order: 1 },
    { project_id: mobileApp, name: 'Notifications System', sort_order: 2 },
  ]).select()

  const logoComp = compData?.find((c: any) => c.name === 'Logo & Identity')?.id
  const collateralComp = compData?.find((c: any) => c.name === 'Marketing Collateral')?.id
  const authComp = compData?.find((c: any) => c.name === 'Authentication Module')?.id
  const dashComp = compData?.find((c: any) => c.name === 'Dashboard & Analytics')?.id
  const notifComp = compData?.find((c: any) => c.name === 'Notifications System')?.id

  // Issues
  const { data: issueData } = await supabase.from('issues').insert([
    { component_id: logoComp, name: 'Primary Logo Design', sort_order: 0 },
    { component_id: logoComp, name: 'Colour Palette', sort_order: 1 },
    { component_id: logoComp, name: 'Typography System', sort_order: 2 },
    { component_id: collateralComp, name: 'Business Cards', sort_order: 0 },
    { component_id: collateralComp, name: 'Letterhead & Stationery', sort_order: 1 },
    { component_id: authComp, name: 'Login & Registration', sort_order: 0 },
    { component_id: authComp, name: 'OAuth Integration', sort_order: 1 },
    { component_id: dashComp, name: 'Analytics Dashboard', sort_order: 0 },
    { component_id: notifComp, name: 'Push Notifications', sort_order: 0 },
  ]).select()

  const logo = issueData?.find((i: any) => i.name === 'Primary Logo Design')?.id
  const colour = issueData?.find((i: any) => i.name === 'Colour Palette')?.id
  const typography = issueData?.find((i: any) => i.name === 'Typography System')?.id
  const bizCards = issueData?.find((i: any) => i.name === 'Business Cards')?.id
  const letterhead = issueData?.find((i: any) => i.name === 'Letterhead & Stationery')?.id
  const loginIssue = issueData?.find((i: any) => i.name === 'Login & Registration')?.id
  const oauth = issueData?.find((i: any) => i.name === 'OAuth Integration')?.id
  const analytics = issueData?.find((i: any) => i.name === 'Analytics Dashboard')?.id
  const pushNotif = issueData?.find((i: any) => i.name === 'Push Notifications')?.id

  // Issue Fields
  await supabase.from('issue_fields').insert([
    // Primary Logo
    { issue_id: logo, category_id: briefing, assignee_id: sarah, lead_time: 3, start_date: '2026-01-05', end_date: '2026-01-07', status_id: complete },
    { issue_id: logo, category_id: design, assignee_id: lisa, lead_time: 10, start_date: '2026-01-08', end_date: '2026-01-21', status_id: complete },
    { issue_id: logo, category_id: review, assignee_id: sarah, lead_time: 5, start_date: '2026-01-22', end_date: '2026-01-28', status_id: complete },
    { issue_id: logo, category_id: delivery, assignee_id: lisa, lead_time: 3, start_date: '2026-01-29', end_date: '2026-02-02', status_id: inReview },
    // Colour Palette
    { issue_id: colour, category_id: briefing, assignee_id: sarah, lead_time: 2, start_date: '2026-01-05', end_date: '2026-01-06', status_id: complete },
    { issue_id: colour, category_id: design, assignee_id: david, lead_time: 7, start_date: '2026-01-08', end_date: '2026-01-16', status_id: complete },
    { issue_id: colour, category_id: review, assignee_id: sarah, lead_time: 3, start_date: '2026-01-19', end_date: '2026-01-21', status_id: inProgress },
    { issue_id: colour, category_id: delivery, assignee_id: david, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
    // Typography
    { issue_id: typography, category_id: briefing, assignee_id: michael, lead_time: 2, start_date: '2026-01-05', end_date: '2026-01-06', status_id: complete },
    { issue_id: typography, category_id: design, assignee_id: lisa, lead_time: 8, start_date: '2026-01-08', end_date: '2026-01-19', status_id: inProgress },
    { issue_id: typography, category_id: review, assignee_id: null, lead_time: 3, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: typography, category_id: delivery, assignee_id: null, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
    // Business Cards
    { issue_id: bizCards, category_id: briefing, assignee_id: emily, lead_time: 2, start_date: '2026-02-02', end_date: '2026-02-03', status_id: complete },
    { issue_id: bizCards, category_id: design, assignee_id: anna, lead_time: 5, start_date: '2026-02-04', end_date: '2026-02-10', status_id: inProgress },
    { issue_id: bizCards, category_id: review, assignee_id: emily, lead_time: 3, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: bizCards, category_id: delivery, assignee_id: null, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
    // Letterhead
    { issue_id: letterhead, category_id: briefing, assignee_id: emily, lead_time: 2, start_date: '2026-02-02', end_date: '2026-02-03', status_id: inProgress },
    { issue_id: letterhead, category_id: design, assignee_id: null, lead_time: 5, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: letterhead, category_id: review, assignee_id: null, lead_time: 3, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: letterhead, category_id: delivery, assignee_id: null, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
    // Login & Registration
    { issue_id: loginIssue, category_id: planning, assignee_id: michael, lead_time: 5, start_date: '2026-01-12', end_date: '2026-01-16', status_id: complete },
    { issue_id: loginIssue, category_id: development, assignee_id: michael, lead_time: 15, start_date: '2026-01-19', end_date: '2026-02-06', status_id: complete },
    { issue_id: loginIssue, category_id: testing, assignee_id: james, lead_time: 7, start_date: '2026-02-09', end_date: '2026-02-17', status_id: inReview },
    { issue_id: loginIssue, category_id: launch, assignee_id: null, lead_time: 3, start_date: null, end_date: null, status_id: notStarted },
    // OAuth
    { issue_id: oauth, category_id: planning, assignee_id: michael, lead_time: 3, start_date: '2026-01-12', end_date: '2026-01-14', status_id: complete },
    { issue_id: oauth, category_id: development, assignee_id: david, lead_time: 12, start_date: '2026-01-19', end_date: '2026-02-03', status_id: inProgress },
    { issue_id: oauth, category_id: testing, assignee_id: null, lead_time: 5, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: oauth, category_id: launch, assignee_id: null, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
    // Analytics Dashboard
    { issue_id: analytics, category_id: planning, assignee_id: emily, lead_time: 5, start_date: '2026-01-12', end_date: '2026-01-16', status_id: complete },
    { issue_id: analytics, category_id: development, assignee_id: emily, lead_time: 20, start_date: '2026-01-19', end_date: '2026-02-13', status_id: inProgress },
    { issue_id: analytics, category_id: testing, assignee_id: null, lead_time: 10, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: analytics, category_id: launch, assignee_id: null, lead_time: 3, start_date: null, end_date: null, status_id: notStarted },
    // Push Notifications
    { issue_id: pushNotif, category_id: planning, assignee_id: james, lead_time: 3, start_date: '2026-02-02', end_date: '2026-02-04', status_id: complete },
    { issue_id: pushNotif, category_id: development, assignee_id: anna, lead_time: 10, start_date: '2026-02-05', end_date: '2026-02-18', status_id: onHold },
    { issue_id: pushNotif, category_id: testing, assignee_id: null, lead_time: 5, start_date: null, end_date: null, status_id: notStarted },
    { issue_id: pushNotif, category_id: launch, assignee_id: null, lead_time: 2, start_date: null, end_date: null, status_id: notStarted },
  ])

  // Reset log
  await supabase.from('reset_log').insert({
    reset_at: new Date().toISOString(),
    next_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  })
}
