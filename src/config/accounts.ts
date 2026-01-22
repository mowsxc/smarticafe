import { ACCOUNTS_EXAMPLE, type AccountsConfig } from './accounts.example'

const localModules = import.meta.glob('./accounts.local.ts', { eager: true }) as Record<
  string,
  { ACCOUNTS?: AccountsConfig }
>

const local = localModules['./accounts.local.ts']

export const ACCOUNTS: AccountsConfig = local?.ACCOUNTS ?? ACCOUNTS_EXAMPLE

export type { AccountsConfig }
