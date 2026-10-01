import { createTheme, type ButtonProps, type CSSVariablesResolver, type MantineColorsTuple, type MantineTheme } from '@mantine/core'

const dark: MantineColorsTuple = [
  '#f4f6f7',
  '#f4f6f7db',
  '#f4f6f799',
  '#f4f6f766',
  '#ffffff2e',
  '#22262b',
  '#1c1f23',
  '#141619',
  '#0d0f11',
  '#0d0f11',
]

const accent: MantineColorsTuple = [
  '#ddfaf5',
  '#98fce4',
  '#7ae8d4',
  '#50d2c1',
  '#3ec1ad',
  '#2eaa98',
  '#248f80',
  '#1b7368',
  '#145850',
  '#0e3d38',
]

export const theme = createTheme({
  primaryColor: 'accent',
  primaryShade: 3,
  white: '#f4f6f7',
  black: '#141619',
  fontFamily: "'Manrope Variable', sans-serif",
  headings: {
    fontFamily: "'Manrope Variable', sans-serif",
    fontWeight: '700',
  },
  defaultRadius: 'md',
  colors: { dark, accent },
  components: {
    Button: {
      styles: (_theme: MantineTheme, props: ButtonProps) => ({
        root: {
          color: props.variant == null || props.variant === 'filled' ? 'var(--hc-on-accent)' : undefined,
        },
      }),
    },
    Input: {
      styles: {
        input: {
          backgroundColor: 'var(--mantine-color-default-hover)',
          borderColor: 'var(--mantine-color-default-border)',
          color: 'var(--mantine-color-text)',
        },
      },
    },
    Paper: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-default)',
          borderColor: 'var(--mantine-color-default-border)',
        },
      },
    },
    SegmentedControl: {
      styles: {
        root: {
          backgroundColor: 'var(--hc-segment)',
        },
        indicator: {
          backgroundColor: 'var(--hc-segment-indicator)',
        },
      },
    },
    Popover: {
      styles: {
        dropdown: {
          backgroundColor: 'var(--mantine-color-default)',
          borderColor: 'var(--mantine-color-default-border)',
        },
      },
    },
    Slider: {
      styles: {
        root: {
          '--slider-color': 'var(--hc-slider)',
        },
      },
    },
    Tooltip: {
      styles: {
        tooltip: {
          '--tooltip-bg': 'var(--hc-tooltip-bg)',
          '--tooltip-color': 'var(--hc-tooltip-color)',
          boxShadow: 'var(--hc-shadow)',
        },
      },
    },
  },
})

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#eef1f2',
    '--mantine-color-text': '#141619',
    '--mantine-color-dimmed': 'rgba(20, 22, 25, 0.62)',
    '--mantine-color-placeholder': 'rgba(20, 22, 25, 0.42)',
    '--mantine-color-default': '#ffffff',
    '--mantine-color-default-hover': '#e7ebed',
    '--mantine-color-default-color': '#141619',
    '--mantine-color-default-border': 'rgba(20, 22, 25, 0.12)',
    '--mantine-color-accent-filled': '#1c5544',
    '--mantine-color-accent-filled-hover': '#16463a',
    '--mantine-color-accent-light': 'rgba(28, 85, 68, 0.12)',
    '--mantine-color-accent-light-hover': 'rgba(28, 85, 68, 0.18)',
    '--mantine-color-accent-light-color': '#1c5544',
    '--mantine-color-accent-outline': '#1c5544',
    '--mantine-color-anchor': '#1c5544',
    '--hc-on-accent': '#f4f6f7',
    '--hc-focus': '#1c5544',
    '--hc-focus-ring': 'rgba(28, 85, 68, 0.45)',
    '--hc-emphasis': '#0d0f11',
    '--hc-segment': '#e7ebed',
    '--hc-segment-indicator': '#ffffff',
    '--hc-slider': '#6f817d',
    '--hc-shadow': '0 12px 32px rgba(20, 22, 25, 0.12)',
    '--hc-card-bg': '#ffffff',
    '--hc-card-edge': 'rgba(20, 22, 25, 0.12)',
    '--hc-card-top': '#ffffff',
    '--hc-card-highlight': 'inset 0 1px 0 #ffffff',
    '--hc-card-shadow': '0 1px 2px rgba(20, 22, 25, 0.06), 0 10px 24px rgba(20, 22, 25, 0.08)',
    '--hc-card-shadow-quiet': '0 1px 1px rgba(20, 22, 25, 0.05), 0 6px 14px rgba(20, 22, 25, 0.06)',
    '--hc-card-shadow-hover': 'inset 0 1px 0 #ffffff, 0 2px 4px rgba(20, 22, 25, 0.06), 0 16px 32px rgba(20, 22, 25, 0.12)',
    '--hc-page-vignette': 'radial-gradient(1200px 520px at 50% -8%, rgba(255, 255, 255, 0.85), transparent 60%)',
    '--hc-safe': '#1c5544',
    '--hc-warn': '#9a5d10',
    '--hc-danger': '#d12424',
    '--hc-mark': '#1c5544',
    '--hc-pick-bg': 'rgba(28, 85, 68, 0.12)',
    '--hc-pick-border': 'rgba(28, 85, 68, 0.32)',
    '--hc-pick': '#1c5544',
    '--hc-pick-hover-bg': 'rgba(28, 85, 68, 0.2)',
    '--hc-pick-hover-border': 'rgba(28, 85, 68, 0.46)',
    '--hc-pick-hover': '#143d32',
    '--hc-switch': '#1c5544',
    '--hc-tooltip-bg': '#ffffff',
    '--hc-tooltip-color': '#141619',
    '--hc-field-bg': '#ffffff',
    '--hc-field-border': 'rgba(20, 22, 25, 0.12)',
  },
  dark: {
    '--mantine-color-body': '#141619',
    '--mantine-color-text': '#f4f6f7',
    '--mantine-color-dimmed': 'rgba(244,246,247,0.6)',
    '--mantine-color-placeholder': 'rgba(244,246,247,0.4)',
    '--mantine-color-default': '#1c1f23',
    '--mantine-color-default-hover': '#22262b',
    '--mantine-color-default-color': '#f4f6f7',
    '--mantine-color-default-border': 'rgba(255,255,255,0.09)',
    '--hc-on-accent': '#141619',
    '--hc-focus': '#50d2c1',
    '--hc-focus-ring': 'rgba(80, 210, 193, 0.55)',
    '--hc-emphasis': '#ffffff',
    '--hc-segment': '#0d0f11',
    '--hc-segment-indicator': '#22262b',
    '--hc-slider': '#8a9a96',
    '--hc-shadow': '0 12px 32px rgba(0, 0, 0, 0.35)',
    '--hc-card-bg': '#1c1f23',
    '--hc-card-edge': 'rgba(255, 255, 255, 0.09)',
    '--hc-card-top': '#1c1f23',
    '--hc-card-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.35)',
    '--hc-card-shadow': '0 1px 2px rgba(0, 0, 0, 0.24), 0 12px 28px rgba(0, 0, 0, 0.28)',
    '--hc-card-shadow-quiet': '0 1px 1px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.22)',
    '--hc-card-shadow-hover': 'inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 16px 36px rgba(0, 0, 0, 0.38)',
    '--hc-page-vignette': 'radial-gradient(1200px 520px at 50% -8%, rgba(255, 255, 255, 0.045), transparent 58%)',
    '--hc-safe': '#50d2c1',
    '--hc-warn': '#f5b66b',
    '--hc-danger': '#ff6565',
    '--hc-mark': '#50d2c1',
    '--hc-pick-bg': 'rgba(80, 210, 193, 0.16)',
    '--hc-pick-border': 'rgba(80, 210, 193, 0.32)',
    '--hc-pick': '#8fe0d4',
    '--hc-pick-hover-bg': 'rgba(80, 210, 193, 0.26)',
    '--hc-pick-hover-border': 'rgba(80, 210, 193, 0.48)',
    '--hc-pick-hover': '#b7f0e8',
    '--hc-switch': '#2eaa98',
    '--hc-tooltip-bg': '#22262b',
    '--hc-tooltip-color': '#f4f6f7',
    '--hc-field-bg': '#0d0f11',
    '--hc-field-border': 'transparent',
  },
})
