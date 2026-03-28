import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from '@/lib/i18n/resources'

void i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
