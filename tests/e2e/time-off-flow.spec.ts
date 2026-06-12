import { test, expect } from '@playwright/test'

// Helper to reset the in-memory mock store before each test.
// This ensures balance and request state is deterministic.
async function resetStore(request: Parameters<Parameters<typeof test>[1]>[0]['request']) {
  const res = await request.post('/api/hcm/debug', {
    data: { action: 'reset_store' },
  })
  expect(res.ok()).toBe(true)
}

// The start date must be a weekday in the future.
// June 16 2026 is a Monday.
const START_DATE = '2026-06-16'
const END_DATE = '2026-06-16' // single working day

test.describe('Time-off flow — employee submits, manager approves', () => {
  test.beforeEach(async ({ request }) => {
    await resetStore(request)
  })

  test('employee submits a request and sees optimistic pending state', async ({ page }) => {
    await page.goto('/employee')

    // Wait for the balance cards and form to load
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    // Fill the request form
    await page.selectOption('#leave-type', 'annual')
    await page.fill('#start-date', START_DATE)
    await page.fill('#end-date', END_DATE)

    // Verify the day count is computed
    await expect(page.getByText('1 working day')).toBeVisible()

    // Submit
    await page.getByRole('button', { name: 'Submit Request' }).click()

    // The optimistic row should appear immediately (pending state from reservation ledger)
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 5_000 })
  })

  test('employee → manager full approval flow', async ({ page, request }) => {
    // ── Employee submits ────────────────────────────────────────────────────
    await page.goto('/employee')
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    await page.selectOption('#leave-type', 'annual')
    await page.fill('#start-date', START_DATE)
    await page.fill('#end-date', END_DATE)
    await page.getByRole('button', { name: 'Submit Request' }).click()

    // Wait for optimistic pending (fast path)
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 5_000 })

    // Wait for the reservation to be confirmed via SSE (the real SSE stream fires)
    // The "Pending" badge on the employee side transitions to "Confirmed" or
    // the request appears in the HCM list. We give it a few seconds.
    await page.waitForTimeout(2_000)

    // ── Manager reviews ─────────────────────────────────────────────────────
    await page.goto('/manager')

    // The request submitted above should appear in the "Awaiting Review" list
    const pendingList = page.locator('ul[aria-label="Pending requests"]')
    await expect(pendingList).toBeVisible({ timeout: 10_000 })

    // Find and click the Approve button on the first pending card
    const approveBtn = page.getByRole('button', { name: 'Approve request' }).first()
    await expect(approveBtn).toBeVisible({ timeout: 5_000 })
    await approveBtn.click()

    // Immediate visual feedback — ApprovalActions shows "Approved ✓" on isSuccess
    await expect(page.getByText('Approved ✓')).toBeVisible({ timeout: 5_000 })
  })

  test('manager deny flow shows denial confirmation', async ({ page, request }) => {
    // Submit a request first via the employee page
    await page.goto('/employee')
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 })

    await page.selectOption('#leave-type', 'annual')
    await page.fill('#start-date', START_DATE)
    await page.fill('#end-date', END_DATE)
    await page.getByRole('button', { name: 'Submit Request' }).click()
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(2_000)

    // Manager denies
    await page.goto('/manager')
    await expect(page.locator('ul[aria-label="Pending requests"]')).toBeVisible({ timeout: 10_000 })

    const denyBtn = page.getByRole('button', { name: 'Deny request' }).first()
    await expect(denyBtn).toBeVisible({ timeout: 5_000 })
    await denyBtn.click()

    // Dialog opens
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.fill('#deny-notes', 'Peak period — insufficient cover')

    // Confirm denial in dialog
    await page.getByRole('button', { name: 'Deny Request' }).click()

    // Denial confirmation
    await expect(page.getByText('Denied ✓')).toBeVisible({ timeout: 5_000 })
  })

  test('home page redirects to /employee', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/employee/)
  })
})
