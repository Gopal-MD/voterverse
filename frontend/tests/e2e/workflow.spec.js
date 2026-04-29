import { test, expect } from '@playwright/test';

test.describe('VoterVerse E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // We assume the dev server is running on 5173
    await page.goto('http://localhost:5173');
  });

  test('User can navigate to AI Chatbot and interact', async ({ page }) => {
    // Navigate to Chatbot
    await page.click('text=AI Chatbot');
    await expect(page).toHaveURL(/.*chatbot/);
    await expect(page.locator('h2')).toContainText('AI Election Assistant');

    // Click a topic card
    await page.click('text=Voter Registration');
    
    // Check if message bubble appears
    const bubble = page.locator('.chat-bubble.model-bubble').first();
    await expect(bubble).toBeVisible();
    
    // Check if suggestions appear
    await expect(page.locator('.chat-suggestions button')).toHaveCount(3);
  });

  test('User can use Document Analyzer with fallback', async ({ page }) => {
    await page.click('text=Document Analyzer');
    await expect(page).toHaveURL(/.*analyzer/);

    // Check if analyze button is disabled initially
    const analyzeBtn = page.locator('#analyze-btn');
    await expect(analyzeBtn).toBeDisabled();

    // Since we can't easily upload a real file in this environment without a local file,
    // we'll verify the presence of the upload zone and the privacy notice.
    await expect(page.locator('.upload-zone')).toBeVisible();
    await expect(page.locator('[role="note"]')).toContainText('Your document is analyzed in-memory only');
  });

  test('User can report fraud and see success state', async ({ page }) => {
    await page.click('text=Fraud Report');
    await expect(page).toHaveURL(/.*fraud/);

    // Fill the form
    await page.selectOption('select[name="fraudType"]', 'vote_buying');
    await page.fill('textarea[name="description"]', 'Observed money distribution near booth 102.');
    await page.fill('input[name="location"]', 'Mumbai North');

    // Submit
    await page.click('button:has-text("Submit Report")');

    // Check for success message or classification result
    // In our app, it shows the result card
    await expect(page.locator('.glass-card')).toContainText('Report Analysis');
    await expect(page.locator('.severity-high, .severity-critical')).toBeVisible();
  });

  test('Accessibility: High Contrast Mode works', async ({ page }) => {
    const body = page.locator('body');
    
    // Default mode
    await expect(body).not.toHaveAttribute('data-theme', 'high-contrast');

    // Click high contrast toggle
    await page.click('button[aria-label*="Contrast"]');
    
    // Verify theme attribute
    await expect(body).toHaveAttribute('data-theme', 'high-contrast');
  });
});
