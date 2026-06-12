import { EmployeeView } from './EmployeeView'

// Demo: hardcoded to emp-001 (Alice). A real implementation would
// derive this from the authenticated session.
export default function EmployeePage() {
  return <EmployeeView employeeId="emp-001" employeeName="Alice" />
}
