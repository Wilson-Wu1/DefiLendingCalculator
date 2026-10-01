import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import '@mantine/core/styles.css'
import App from './App.tsx'
import './motion.css'
import { cssVariablesResolver, theme } from './theme.ts'
import { AnimationsProvider, applyStoredAnimations } from './ui/animations.tsx'

applyStoredAnimations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark" cssVariablesResolver={cssVariablesResolver}>
      <AnimationsProvider>
        <App />
      </AnimationsProvider>
    </MantineProvider>
  </StrictMode>,
)
