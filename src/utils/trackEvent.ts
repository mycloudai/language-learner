import { track } from '@vercel/analytics'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export const trackPromotionEvent = (event: string, properties: Record<string, string>) => {
  track(event, properties)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', event, { ...properties })
      if (properties.action_detail) {
        window.gtag('event', properties.action_detail)
      }
    } catch (error) {
      console.error(error)
    }
  }
}
