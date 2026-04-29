/**
 * VoterVerse — Standalone Mock Test Runner
 * Runs WITHOUT any server — pure logic validation
 * Usage: node tests/mock-test-runner.js
 */

const path = require('path');
let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; console.log(`  ✅ PASS: ${name}`); }
  else { failed++; console.log(`  ❌ FAIL: ${name}`); }
}

console.log('\n🗳️  VoterVerse Mock Test Runner\n' + '═'.repeat(50));

// ─── Test 1: Timeline Data Structure ───
console.log('\n📅 Test Suite: Election Timeline Data');
const { ELECTION_TIMELINE } = require(path.resolve(__dirname, '..', 'backend', 'database'));
assert(Array.isArray(ELECTION_TIMELINE), 'Timeline is an array');
assert(ELECTION_TIMELINE.length === 7, 'Timeline has 7 steps');
ELECTION_TIMELINE.forEach((step, i) => {
  assert(typeof step.step === 'number', `Step ${i + 1} has numeric step`);
  assert(typeof step.title === 'string' && step.title.length > 0, `Step ${i + 1} has title`);
  assert(typeof step.description === 'string' && step.description.length > 0, `Step ${i + 1} has description`);
  assert(typeof step.icon === 'string', `Step ${i + 1} has icon`);
  assert(typeof step.date === 'string', `Step ${i + 1} has date`);
  assert(typeof step.details === 'string', `Step ${i + 1} has details`);
});

// ─── Test 2: Quiz Question Format (mock) ───
console.log('\n🧠 Test Suite: Quiz Question Format');
const { MOCK_RESPONSES } = require(path.resolve(__dirname, '..', 'backend', 'aiService'));
const quizMocks = MOCK_RESPONSES.quiz;
assert(Array.isArray(quizMocks), 'Quiz mock is an array');
assert(quizMocks.length >= 3, 'At least 3 mock quiz questions');
quizMocks.forEach((q, i) => {
  assert(typeof q.question === 'string' && q.question.length > 0, `Quiz ${i + 1} has question text`);
  assert(Array.isArray(q.options) && q.options.length === 4, `Quiz ${i + 1} has exactly 4 options`);
  assert(typeof q.correct_index === 'number' && q.correct_index >= 0 && q.correct_index <= 3, `Quiz ${i + 1} has valid correct_index`);
  assert(typeof q.explanation === 'string' && q.explanation.length > 0, `Quiz ${i + 1} has explanation`);
});

// ─── Test 3: Fraud Classification Schema ───
console.log('\n🚨 Test Suite: Fraud Classification Schema');
const fraudMock = MOCK_RESPONSES.fraud;
assert(typeof fraudMock.fraud_type === 'string', 'Fraud mock has fraud_type');
const validTypes = ['booth_capturing', 'vote_buying', 'impersonation', 'EVM_tampering', 'intimidation', 'misinformation', 'other'];
assert(validTypes.includes(fraudMock.fraud_type), 'fraud_type is a valid enum value');
assert(['low', 'medium', 'high', 'critical'].includes(fraudMock.severity), 'severity is valid enum');
assert(typeof fraudMock.recommended_action === 'string' && fraudMock.recommended_action.length > 0, 'Has recommended_action');
assert(typeof fraudMock.eci_reference === 'string', 'Has eci_reference');

// ─── Test 4: Document Analysis Schema ───
console.log('\n📄 Test Suite: Document Analysis Schema');
const docMock = MOCK_RESPONSES.document;
assert(typeof docMock.document_type === 'string', 'Document mock has document_type');
assert(typeof docMock.key_information === 'string', 'Has key_information');
assert(typeof docMock.required_action === 'string', 'Has required_action');

// ─── Test 5: Mock Cloud Function Validators ───
console.log('\n☁️  Test Suite: Cloud Function Validators');
const { validateFraudReport, validateQuizAnswer } = require(path.resolve(__dirname, '..', 'backend', 'cloud-functions', 'mockFunctions'));
const validReport = validateFraudReport({ description: 'Someone is buying votes near booth 12', location: 'Delhi', fraudType: 'vote_buying' });
assert(validReport.valid === true, 'Valid fraud report passes validation');
const invalidReport = validateFraudReport({ description: 'short', location: '' });
assert(invalidReport.valid === false, 'Invalid fraud report fails validation');
assert(invalidReport.errors.length >= 1, 'Invalid report has error messages');

const validAnswer = validateQuizAnswer({ questionIndex: 0, selectedOption: 2 });
assert(validAnswer.valid === true, 'Valid quiz answer passes');
const invalidAnswer = validateQuizAnswer({ questionIndex: 0, selectedOption: 5 });
assert(invalidAnswer.valid === false, 'Out-of-range quiz answer fails');

// ─── Test 6: Audit Logger ───
console.log('\n📝 Test Suite: Audit Logger');
const logger = require(path.resolve(__dirname, '..', 'backend', 'auditLogger'));
assert(typeof logger.info === 'function', 'Logger has info method');
assert(typeof logger.warn === 'function', 'Logger has warn method');
assert(typeof logger.error === 'function', 'Logger has error method');

// ─── Test 7: Data Files ───
console.log('\n📂 Test Suite: Test Data Files');
const voters = require(path.resolve(__dirname, 'data', 'voters.json'));
assert(Array.isArray(voters) && voters.length > 0, 'voters.json has data');
const timelines = require(path.resolve(__dirname, 'data', 'timelines.json'));
assert(Array.isArray(timelines) && timelines.length === 7, 'timelines.json has 7 entries');

// ─── Results ───
console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

if (failed > 0) {
  console.log('❌ SOME TESTS FAILED\n');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED\n');
  process.exit(0);
}
