import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSyncService } from '../services/supabase/client'
import { tauriCmd } from '../utils/tauri'

export type LogoStyle = 'normal' | 'led' | 'neon' | '3d'

export interface BrandSettings {
  brandName: string
  systemName: string
  storeName: string
  showStoreName: boolean
}

export interface LogoSettings {
  style: LogoStyle
  fontSize: {
    brand: number
    system: number
    store: number
  }
  height: number
  borderRadius: number
  padding: number
  bgGradientStart: string
  bgGradientEnd: string
  textColor: string
  glowIntensity: number
  neonColor: string
  marginRight: number
  verticalGap: number
  paddingTop: number
}

export interface AnimationSettings {
  duration: number
  transitionType: 'ease' | 'linear' | 'cubic'
}

export interface CloudSettings {
  enabled: boolean
  supabaseUrl: string
  supabaseAnonKey: string
}

export interface BusinessSettings {
  passwordlessAll: boolean
  equityEnabled: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const brandSettings = ref<BrandSettings>({
    brandName: '',
    systemName: 'Smarticafe',
    storeName: '',
    showStoreName: true,
  })

  const logoSettings = ref<LogoSettings>({
    style: 'normal',
    fontSize: { brand: 18, system: 18, store: 11 },
    height: 52,
    borderRadius: 8,
    padding: 8,
    bgGradientStart: '#f8fafc',
    bgGradientEnd: '#f1f5f9',
    textColor: '#1f2937',
    glowIntensity: 0,
    neonColor: '#f97316',
    marginRight: 6,
    verticalGap: 2,
    paddingTop: 2,
  })

  const animationSettings = ref<AnimationSettings>({
    duration: 200,
    transitionType: 'ease',
  })

  const cloudSettings = ref<CloudSettings>({
    enabled: false,
    supabaseUrl: '',
    supabaseAnonKey: '',
  })

  const businessSettings = ref<BusinessSettings>({
    passwordlessAll: true,
    equityEnabled: false,
  })

  const initialized = ref(false)

  const applyAnimationDuration = () => {
    document.documentElement.style.setProperty('--animation-duration', `${animationSettings.value.duration}ms`)
  }

  const enqueueSetting = (scope: string, payload: Record<string, unknown>) => {
    try {
      const syncService = getSyncService()
      syncService.enqueue({
        table: 'app_settings',
        operation: 'upsert',
        data: {
          scope,
          payload,
          updated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.warn('Failed to enqueue settings sync:', error)
    }
  }

  const init = async () => {
    if (initialized.value) return
    initialized.value = true

    try {
      // Load all settings from Backend Database (The source of truth)
      console.log('Loading settings from database...')

      // Load brand settings
      const brandRes = await tauriCmd<any>('auth_get_brand_settings')
      if (brandRes) {
        brandSettings.value.brandName = brandRes.brand_name || ''
        brandSettings.value.storeName = brandRes.store_name || ''
        console.log('Brand settings loaded from DB')
      }

      // Load cloud settings
      const cloudRes = await tauriCmd<any>('kv_get', { key: 'settings.cloud' })
      if (cloudRes && typeof cloudRes === 'object') {
        cloudSettings.value = {
          enabled: !!cloudRes.enabled,
          supabaseUrl: String(cloudRes.supabaseUrl || ''),
          supabaseAnonKey: String(cloudRes.supabaseAnonKey || ''),
        }
        console.log('Cloud settings loaded from DB')
      }

      // Load business settings
      const businessRes = await tauriCmd<any>('kv_get', { key: 'settings.business' })
      if (businessRes && typeof businessRes === 'object') {
        businessSettings.value = {
          passwordlessAll: businessRes.passwordlessAll === undefined ? businessSettings.value.passwordlessAll : !!businessRes.passwordlessAll,
          equityEnabled: businessRes.equityEnabled === undefined ? businessSettings.value.equityEnabled : !!businessRes.equityEnabled,
        }
        console.log('Business settings loaded from DB')
      }

      // Load animation settings (stored in KV)
      const animRes = await tauriCmd<any>('kv_get', { key: 'settings.animation' })
      if (animRes && typeof animRes === 'object') {
        animationSettings.value = {
          duration: animRes.duration || 200,
          transitionType: animRes.transitionType || 'ease',
        }
        console.log('Animation settings loaded from DB')
      }

      // Load logo settings (stored in KV)
      const logoRes = await tauriCmd<any>('kv_get', { key: 'settings.logo' })
      if (logoRes && typeof logoRes === 'object') {
        logoSettings.value = { ...logoSettings.value, ...logoRes }
        console.log('Logo settings loaded from DB')
      }

      console.log('All settings loaded from database successfully')
    } catch (error) {
      console.error('Failed to load settings from database:', error)
    }

    applyAnimationDuration()
  }

  watch(animationSettings, () => {
    applyAnimationDuration()
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.animation', value: animationSettings.value })
        enqueueSetting('animation', animationSettings.value)
      } catch (error) {
        console.error('Failed to save animation settings:', error)
      }
    })()
  }, { deep: true })

  watch(brandSettings, () => {
    ;(async () => {
      try {
        await tauriCmd('auth_update_brand_settings', {
          token: localStorage.getItem('auth_token') || '',
          input: {
            brand_name: brandSettings.value.brandName,
            store_name: brandSettings.value.storeName
          }
        })
        enqueueSetting('brand', brandSettings.value)
      } catch (error) {
        console.error('Failed to save brand settings:', error)
      }
    })()
  }, { deep: true })

  watch(logoSettings, () => {
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.logo', value: logoSettings.value })
        enqueueSetting('logo', logoSettings.value)
      } catch (error) {
        console.error('Failed to save logo settings:', error)
      }
    })()
  }, { deep: true })

  watch(cloudSettings, () => {
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.cloud', value: cloudSettings.value })
        enqueueSetting('cloud', { enabled: cloudSettings.value.enabled })
      } catch (error) {
        console.error('Failed to save cloud settings:', error)
      }
    })()
  }, { deep: true })

  watch(businessSettings, () => {
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.business', value: businessSettings.value })
        enqueueSetting('business', businessSettings.value)
      } catch (error) {
        console.error('Failed to save business settings:', error)
      }
    })()
  }, { deep: true })

  const syncToCloud = async () => {
    const syncService = getSyncService()
    return await syncService.forceSync()
  }

  return {
    brandSettings,
    logoSettings,
    animationSettings,
    cloudSettings,
    businessSettings,
    init,
    syncToCloud,
    saveBrandSettings: async () => {
      try {
          await tauriCmd('auth_update_brand_settings', {
              token: localStorage.getItem('auth_token') || '',
              input: {
                  brand_name: brandSettings.value.brandName,
                  store_name: brandSettings.value.storeName
              }
          });
          console.log('Brand settings saved to database');
      } catch (err) {
          console.error('Failed to save brand settings:', err);
          throw err;
      }
    }
  }
})
