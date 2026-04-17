import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#4F46E5',
          secondary: '#64748B',
          accent: '#8B5CF6',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
          info: '#2563EB',
          surface: '#FFFFFF',
          background: '#F8FAFC',
          'on-surface': '#111827',
          'on-surface-variant': '#6B7280',
          'surface-variant': '#F1F5F9',
          'outline': '#9CA3AF',
          'outline-variant': '#E5E7EB',
        },
      },
    },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'lg', density: 'comfortable' },
    VCard: { rounded: 'lg', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'compact', rounded: 'lg' },
    VSelect: { variant: 'outlined', density: 'compact', rounded: 'lg' },
    VChip: { rounded: 'lg', size: 'small' },
    VDataTable: { density: 'comfortable' },
  },
})
