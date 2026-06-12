import { Banner } from '@/components/ui/Banner'

interface StaleIndicatorProps {
  visible: boolean
  onDismiss: () => void
}

export function StaleIndicator({ visible, onDismiss }: StaleIndicatorProps) {
  if (!visible) return null
  return (
    <Banner variant="info" onDismiss={onDismiss}>
      Balances updated — reflecting latest HCM data.
    </Banner>
  )
}
