export default function ProfilePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your account details</p>
        </div>
      </div>

      <div style={{ maxWidth: '480px' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', marginBottom: '16px' }}>
          
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #ed1c24, #fcaf17)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
              DU
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c2c2b' }}>Demo User</div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Administrator</div>
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Full Name</label>
              <input value="Demo User" disabled
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email Address</label>
              <input value="demo@projectplanner.com" disabled
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Role</label>
              <input value="Admin" disabled
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Password</label>
              <input value="••••••••••••" disabled
                style={{ width: '100%', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box', cursor: 'not-allowed' }} />
            </div>
          </div>
        </div>

        {/* Disabled notice */}
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400e' }}>
          <span>⚠️</span>
          <span>Profile editing is disabled in demo mode. All data resets every 24 hours.</span>
        </div>
      </div>
    </div>
  )
}
