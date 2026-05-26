export interface Department {
    id: string
    name: string
    archived: boolean
    sort_order: number
    created_at: string
  }
  
  export interface Project {
    id: string
    department_id: string
    name: string
    start_date: string | null
    archived: boolean
    sort_order: number
    created_at: string
  }
  
  export interface Component {
    id: string
    project_id: string
    name: string
    sort_order: number
    created_at: string
  }
  
  export interface Issue {
    id: string
    component_id: string
    name: string
    sort_order: number
    created_at: string
  }
  
  export interface Category {
    id: string
    project_id: string
    name: string
    sort_order: number
    created_at: string
  }
  
  export interface IssueField {
    id: string
    issue_id: string
    category_id: string
    assignee_id: string | null
    lead_time: number | null
    start_date: string | null
    end_date: string | null
    start_date_manual: boolean
    status_id: string | null
    sort_order: number
    created_at: string
  }
  
  export interface Staff {
    id: string
    name: string
    email: string | null
    type: 'internal' | 'freelancer'
    active: boolean
    created_at: string
  }
  
  export interface Status {
    id: string
    name: string
    colour: string
    sort_order: number
    created_at: string
  }
  
  export interface NonWorkDay {
    id: string
    date: string
    name: string
    type: 'public_holiday' | 'company_holiday'
    created_at: string
  }
  
  export interface AppUser {
    id: string
    email: string
    name: string
    created_at: string
  }