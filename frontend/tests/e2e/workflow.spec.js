import { test, expect } from '@playwright/test';

// ─── Suite 1: Election Timeline Flow ────────────────────────────────────────

test.describe('Election Timeline Flow', () => {
  test('User views timeline and clicks on a step for AI explanation', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Election Timeline');
    await expect(page).toHaveURL(/.*timeline/);

    // All 7 steps should be rendered
    const steps = page.locator('[aria-label="election process"] li');
    await expect(steps).toHaveCount(7);

    // Click on the first step card
    await page.locator('[aria-label="election process"] li').first().click();

    // AI explanation panel or details section should appear
    const detail = page.locator('.step-detail, .ai-explanation, [role="region"]').first();
    await expect(detail).toBeVisible({ timeout: 10000 });
  });

  test('Timeline page has correct accessibility structure', async ({ page }) => {
    await page.goto('/timeline');
    await expect(page.locator('[role="list"]')).toBeVisible();
    // Page heading should be present
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── Suite 2: Document Analyzer Flow ────────────────────────────────────────

test.describe('Document Analyzer Flow', () => {
  test('Upload zone is visible and analyze button is disabled before upload', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Document Analyzer');
    await expect(page).toHaveURL(/.*analyzer/);

    // Upload zone must be visible
    await expect(page.locator('.upload-zone')).toBeVisible();

    // Analyze button is disabled until a file is chosen
    const analyzeBtn = page.locator('#analyze-btn');
    await expect(analyzeBtn).toBeDisabled();
  });

  test('Privacy notice is shown before any upload', async ({ page }) => {
    await page.goto('/document-analyzer');
    await expect(page.locator('[role="note"]')).toContainText('Your document is analyzed in-memory only');
  });

  test('Page heading and description are rendered', async ({ page }) => {
    await page.goto('/document-analyzer');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

// ─── Suite 3: Fraud Report Submission ───────────────────────────────────────

test.describe('Fraud Report Submission', () => {
  test('Form renders with required fields', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Fraud Report');
    await expect(page).toHaveURL(/.*fraud/);

    await expect(page.locator('select[name="fraudType"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="location"]')).toBeVisible();
  });

  test('Submit button is disabled when description is empty', async ({ page }) => {
    await page.goto('/fraud-report');
    const submitBtn = page.locator('button:has-text("Submit Report")');
    await expect(submitBtn).toBeDisabled();
  });

  test('User fills form, submits, and sees AI classification result', async ({ page }) => {
    await page.goto('/fraud-report');

    await page.selectOption('select[name="fraudType"]', 'vote_buying');
    await page.fill('textarea[name="description"]', 'Observed money distribution near booth 102.');
    await page.fill('input[name="location"]', 'Mumbai North');

    // Submit button should now be enabled
    const submitBtn = page.locator('button:has-text("Submit Report")');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Result card with AI analysis should appear
    await expect(page.locator('.glass-card')).toContainText('Report Analysis', { timeout: 15000 });
    // Severity indicator rendered
    await expect(page.locator('[class*="severity"]')).toBeVisible({ timeout: 10000 });
  });

  test('Privacy / anonymity notice is visible', async ({ page }) => {
    await page.goto('/fraud-report');
    await expect(page.locator('text=/anonymi/i')).toBeVisible();
  });
});

// ─── Suite 4: Quiz Arena Flow ────────────────────────────────────────────────

test.describe('Quiz Arena Flow', () => {
  test('Topic selection screen renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Quiz Arena');
    await expect(page).toHaveURL(/.*quiz/);

    await expect(page.locator('text=/choose a topic/i')).toBeVisible();
    await expect(page.locator('text=Voter Registration')).toBeVisible();
  });

  test('Selecting a topic loads a question', async ({ page }) => {
    await page.goto('/quiz');
    await page.click('text=Voter Registration');

    // Loading spinner may appear then a question should render
    const question = page.locator('.question-text, [class*="question"]');
    await expect(question).toBeVisible({ timeout: 15000 });
  });

  test('Answering a question shows correct/incorrect feedback', async ({ page }) => {
    await page.goto('/quiz');
    await page.click('text=Voter Registration');

    // Wait for the question to load
    const optionButtons = page.locator('.option-btn, button[class*="option"]');
    await expect(optionButtons.first()).toBeVisible({ timeout: 15000 });

    // Click the first answer option
    await optionButtons.first().click();

    // Feedback (correct / incorrect indicator) should be visible
    const feedback = page.locator('[class*="correct"], [class*="incorrect"], [class*="answer"]');
    await expect(feedback.first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Suite 5: AI Chatbot Flow ────────────────────────────────────────────────

test.describe('AI Chatbot Flow', () => {
  test('Chatbot page renders with topic cards', async ({ page }) => {
    await page.goto('/');
    await page.click('text=AI Chatbot');
    await expect(page).toHaveURL(/.*chatbot/);

    await expect(page.locator('h2, h1').first()).toBeVisible();
    await expect(page.locator('text=Voter Registration')).toBeVisible();
  });

  test('Clicking a topic card sends a message and receives a response', async ({ page }) => {
    await page.goto('/chatbot');

    await page.click('text=Voter Registration');

    // A model response bubble should appear
    const modelBubble = page.locator('.chat-bubble.model-bubble, [class*="model-bubble"]').first();
    await expect(modelBubble).toBeVisible({ timeout: 20000 });
  });

  test('Typing a question and submitting gets a response', async ({ page }) => {
    await page.goto('/chatbot');

    const input = page.locator('input[placeholder], textarea[placeholder]').first();
    await input.fill('What documents do I need to vote?');
    await page.keyboard.press('Enter');

    const modelBubble = page.locator('.chat-bubble.model-bubble, [class*="model-bubble"]').first();
    await expect(modelBubble).toBeVisible({ timeout: 20000 });
  });

  test('Follow-up suggestion chips are rendered after a response', async ({ page }) => {
    await page.goto('/chatbot');
    await page.click('text=Voter Registration');

    // Suggestions should appear after response
    await expect(page.locator('.chat-suggestions button, [class*="suggestion"] button')).toHaveCount(3, { timeout: 20000 });
  });
});

// ─── Suite 6: Polling Booth Finder ──────────────────────────────────────────

test.describe('Polling Booth Finder', () => {
  test('Page renders the map container and booth list', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Polling Booth');
    await expect(page).toHaveURL(/.*polling/);

    // Map placeholder or Google Maps iframe should be present
    const mapArea = page.locator('#map, .map-container, [class*="map"]');
    await expect(mapArea).toBeVisible({ timeout: 10000 });
  });

  test('Booth list is visible with at least one booth entry', async ({ page }) => {
    await page.goto('/polling-booth');

    const boothItem = page.locator('[class*="booth"], li[class*="booth"], .booth-card').first();
    await expect(boothItem).toBeVisible({ timeout: 10000 });
  });

  test('Locate Me button is present for geolocation', async ({ page }) => {
    await page.goto('/polling-booth');

    const locateBtn = page.locator('button:has-text("Locate"), button[aria-label*="locat" i]');
    await expect(locateBtn).toBeVisible();
  });
});

// ─── Suite 7: Accessibility & Responsiveness ────────────────────────────────

test.describe('Accessibility', () => {
  test('High contrast mode toggle works', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');

    // Default: high-contrast attribute should not be set
    await expect(body).not.toHaveAttribute('data-theme', 'high-contrast');

    // Activate high-contrast mode
    await page.click('button[aria-label*="Contrast"]');
    await expect(body).toHaveAttribute('data-theme', 'high-contrast');
  });

  test('Homepage renders with a main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});
