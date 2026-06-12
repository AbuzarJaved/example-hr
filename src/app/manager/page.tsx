import { ManagerView } from './ManagerView'

// Demo: hardcoded to mgr-001 (Diana). A real implementation would
// derive this from the authenticated session.
export default function ManagerPage() {
  return <ManagerView managerId="mgr-001" managerName="Diana" />
}
