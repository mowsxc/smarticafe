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
    brandName: '创新意 电竞馆',
    systemName: 'SMARTICAFE',
    storeName: '草场地',
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

  const init = () => {
    if (initialized.value) return
    initialized.value = true

    const savedAnim = localStorage.getItem('animationSettings')
    if (savedAnim) {
      try {
        animationSettings.value = { ...animationSettings.value, ...JSON.parse(savedAnim) }
      } catch (error) {
        console.warn('Failed to load animation settings')
      }
    }

    const savedBrand = localStorage.getItem('brandSettings')
    if (savedBrand) {
      try {
        brandSettings.value = { ...brandSettings.value, ...JSON.parse(savedBrand) }
      } catch (error) {
        console.warn('Failed to load brand settings')
      }
    }

    const savedLogo = localStorage.getItem('logoSettings')
    if (savedLogo) {
      try {
        logoSettings.value = { ...logoSettings.value, ...JSON.parse(savedLogo) }
      } catch (error) {
        console.warn('Failed to load logo settings')
      }
    }

    const savedCloud = localStorage.getItem('cloudSettings')
    if (savedCloud) {
      try {
        cloudSettings.value = { ...cloudSettings.value, ...JSON.parse(savedCloud) }
      } catch (error) {
        console.warn('Failed to load cloud settings')
      }
    }

    const savedBusiness = localStorage.getItem('businessSettings')
    if (savedBusiness) {
      try {
        businessSettings.value = { ...businessSettings.value, ...JSON.parse(savedBusiness) }
      } catch (error) {
        console.warn('Failed to load business settings')
      }
    }

    ;(async () => {
      try {
        const v = await tauriCmd<any>('kv_get', { key: 'settings.cloud' })
        if (v && typeof v === 'object') {
          cloudSettings.value = {
            ...cloudSettings.value,
            enabled: !!v.enabled,
            supabaseUrl: String(v.supabaseUrl || ''),
            supabaseAnonKey: String(v.supabaseAnonKey || ''),
          }
          localStorage.setItem('cloudSettings', JSON.stringify(cloudSettings.value))
        }
      } catch {
        // ignore
      }
    })()

    ;(async () => {
      try {
        const v = await tauriCmd<any>('kv_get', { key: 'settings.business' })
        if (v && typeof v === 'object') {
          businessSettings.value = {
            ...businessSettings.value,
            passwordlessAll: v.passwordlessAll === undefined ? businessSettings.value.passwordlessAll : !!v.passwordlessAll,
            equityEnabled: v.equityEnabled === undefined ? businessSettings.value.equityEnabled : !!v.equityEnabled,
          }
          localStorage.setItem('businessSettings', JSON.stringify(businessSettings.value))
        }
      } catch {
        // ignore
      }
    })()

    applyAnimationDuration()
  }

  watch(animationSettings, () => {
    localStorage.setItem('animationSettings', JSON.stringify(animationSettings.value))
    applyAnimationDuration()
    enqueueSetting('animation', animationSettings.value)
  }, { deep: true })

  watch(brandSettings, () => {
    localStorage.setItem('brandSettings', JSON.stringify(brandSettings.value))
    enqueueSetting('brand', brandSettings.value)
  }, { deep: true })

  watch(logoSettings, () => {
    localStorage.setItem('logoSettings', JSON.stringify(logoSettings.value))
    enqueueSetting('logo', logoSettings.value)
  }, { deep: true })

  watch(cloudSettings, () => {
    localStorage.setItem('cloudSettings', JSON.stringify(cloudSettings.value))
    enqueueSetting('cloud', { enabled: cloudSettings.value.enabled })
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.cloud', value: cloudSettings.value })
      } catch {
        // ignore
      }
    })()
  }, { deep: true })

  watch(businessSettings, () => {
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings.value))
    enqueueSetting('business', businessSettings.value)
    ;(async () => {
      try {
        await tauriCmd('kv_set', { key: 'settings.business', value: businessSettings.value })
      } catch {
        // ignore
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
  }
})
