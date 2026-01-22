export type EmployeeAccount = {
  username: string
}

export type ShareholderAccount = {
  displayName: string
  loginKey: string
  role: 'admin' | 'boss'
}

export type AccountsConfig = {
  employees: EmployeeAccount[]
  shareholders: ShareholderAccount[]
}

export const ACCOUNTS_EXAMPLE: AccountsConfig = {
  employees: [{ username: '员工A' }, { username: '员工B' }],
  shareholders: [
    { displayName: '管理员', loginKey: 'admin', role: 'admin' },
    { displayName: '股东A', loginKey: 'boss_a', role: 'boss' },
  ],
}
