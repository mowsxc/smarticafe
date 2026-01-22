# Supabase Row Level Security (RLS) Configuration

## Overview

This document describes the Row Level Security (RLS) policies configured for the Smarticafe Supabase project. RLS provides an additional layer of security for your database by controlling which users can access, insert, update, or delete data in each table.

## Project Configuration

- **Project ID**: `<your_project_ref>`
- **URL**: `https://<your_project_ref>.supabase.co`
- **Environment**: Production

## Architecture

The Smarticafe application uses a **dual-client architecture** for Supabase:

1. **`supabase` (Anon Client)**: Uses the anon key, suitable for browser-side operations
2. **`supabaseAdmin` (Service Role Client)**: Uses the service role key, bypasses RLS

### Why This Architecture?

The sync service prioritizes `supabaseAdmin` for all write operations:

```typescript
const client = supabaseAdmin || supabase
if (!client) return

// Service role key bypasses RLS entirely
const { error } = await client.from('table_name').upsert({...})
```

**Benefits:**
- **Reliability**: Service role has full permissions, ensuring data sync always works
- **Security**: Service role key is never exposed to the browser
- **Performance**: No RLS evaluation overhead for writes

## RLS Policies by Table

### 1. `accounting_entries`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 2. `auth_sessions`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Allow public read | SELECT | authenticated | Authenticated read |
| Allow authenticated insert | INSERT | authenticated | Authenticated insert |
| Allow authenticated update | UPDATE | authenticated | Authenticated update |
| Allow authenticated delete | DELETE | authenticated | Authenticated delete |

### 3. `meituan_orders`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 4. `order_items`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Allow public read | SELECT | authenticated | Authenticated read |
| Allow authenticated insert | INSERT | authenticated | Authenticated insert |
| Allow authenticated update | UPDATE | authenticated | Authenticated update |
| Allow authenticated delete | DELETE | authenticated | Authenticated delete |

### 5. `orders`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Allow public read | SELECT | authenticated | Authenticated read |
| Allow authenticated insert | INSERT | authenticated | Authenticated insert |
| Allow authenticated update | UPDATE | authenticated | Authenticated update |
| Allow authenticated delete | DELETE | authenticated | Authenticated delete |

### 6. `products`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 7. `sales_items`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 8. `sales_orders`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| **Enable anon INSERT access** | INSERT | public | **Browser INSERT (fallback)** |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

**Note**: The `Enable anon INSERT access` policy for `sales_orders` was added as a fallback for browser-based INSERT operations when the service role key is unavailable.

### 9. `shift_records`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 10. `shifts`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for all authenticated users | SELECT | authenticated | Broad read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |
| Enable update access for service role | UPDATE | service_role | Service role update |
| Enable delete access for service role | DELETE | service_role | Service role delete |

### 11. `snapshots`

| Policy Name | Command | Applied To | Description |
|------------|---------|------------|-------------|
| Enable read access for anon users | SELECT | anon | Public read access |
| Enable read access for authenticated users | SELECT | authenticated | Authenticated read access |
| Enable insert access for service role | INSERT | service_role | Service role insert |

## Security Considerations

### Current Configuration

1. **Service Role Key**: Used for all write operations (bypasses RLS)
   - Stored in environment variables (never exposed to browser)
   - Has full CRUD permissions on all tables

2. **Anon Key**: Used for browser-side reads and realtime subscriptions
   - Exposed to browser (safe due to RLS)
   - Only has SELECT permissions (read-only)
   - One exception: `sales_orders` has anon INSERT for fallback

### Why Service Role for Writes?

The application uses the service role key for all database writes because:

1. **Consistency**: Ensures all data syncs successfully regardless of user authentication state
2. **Audit Trail**: Service role operations can be logged separately in Supabase
3. **Performance**: Eliminates RLS policy evaluation overhead
4. **Simplicity**: No need to manage complex user-based permissions

### Anon Key Limitations

The anon key has limited permissions by design:

- **✅ READ**: All tables have SELECT policies for anon users
- **❌ WRITE**: Only `sales_orders` has INSERT policy for anon (fallback)
- **🔐 SECURITY**: Even if anon key is leaked, write access is restricted

## Sync Workflow

### Data Flow

```
Local App (SQLite) 
    → Sync Queue (localStorage)
    → SyncService.sync()
    → supabaseAdmin (Service Role)
    → Supabase Cloud (PostgreSQL)
```

### Conflict Resolution

1. **Timestamp-based**: Uses `synced_at` field to resolve conflicts
2. **Last-write-wins**: Most recent timestamp takes precedence
3. **Offline-first**: Local changes queued when offline, synced when online

### Supported Operations

- **INSERT**: New records synced to cloud
- **UPDATE**: Modified records updated in cloud
- **DELETE**: Deleted records removed from cloud
- **UPSERT**: Insert or update based on existing records

## Monitoring & Troubleshooting

### Check Sync Status

Visit Supabase Dashboard → Observability → Logs to monitor sync operations:

```bash
# Filter logs for sync operations
source: postgres
event: sync
```

### Verify RLS Policies

1. Go to Supabase Dashboard → Authentication → Policies
2. Select each table to view its RLS policies
3. Verify policies match the tables above

### Common Issues

#### Issue: "Row Level Security Error"
**Cause**: Attempting write operation with anon key
**Solution**: Ensure service role key is properly configured in `.env.local`

#### Issue: "No permissions for authenticated role"
**Cause**: Missing SELECT policy for authenticated users
**Solution**: Add SELECT policy for the table in Supabase Dashboard

## Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://<your_project_ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_or_publishable_key>
# ⚠️ Never commit service role key; never expose it to the browser
# VITE_SUPABASE_SERVICE_ROLE_KEY=<never_commit_service_role_key>
```

## Best Practices

1. **Never expose service role key to the browser**
2. **Use anon key for frontend operations**
3. **Enable RLS on all tables**
4. **Create specific policies for each operation**
5. **Test policies before deployment**
6. **Monitor logs for security incidents**

## References

- [Supabase RLS Documentation](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Best Practices](https://supabase.com/docs/guides/auth/security)

---

**Last Updated**: 2026-01-20
**Maintained By**: Smarticafe Development Team
