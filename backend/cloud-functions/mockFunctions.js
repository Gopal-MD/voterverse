/**
 * VoterVerse — Mock Cloud Function Validators
 * Simulates Cloud Function validation for demo/testing
 */

function validateVoterRegistration(data) {
  const errors = [];
  if (!data.name || data.name.trim().length < 2) errors.push('Name is required (min 2 chars)');
  if (!data.age || data.age < 18) errors.push('Must be 18 or older to register');
  if (!data.constituency) errors.push('Constituency is required');
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length === 0 ? 'Registration data is valid' : 'Validation failed',
  };
}

function validateFraudReport(data) {
  const errors = [];
  if (!data.description || data.description.trim().length < 10)
    errors.push('Description must be at least 10 characters');
  if (!data.location) errors.push('Location is required');
  const validTypes = [
    'booth_capturing',
    'vote_buying',
    'impersonation',
    'EVM_tampering',
    'intimidation',
    'misinformation',
    'other',
  ];
  if (data.fraudType && !validTypes.includes(data.fraudType))
    errors.push(`Invalid fraud type. Must be one of: ${validTypes.join(', ')}`);
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length === 0 ? 'Report data is valid' : 'Validation failed',
  };
}

function validateQuizAnswer(data) {
  const errors = [];
  if (typeof data.questionIndex !== 'number') errors.push('questionIndex is required');
  if (typeof data.selectedOption !== 'number') errors.push('selectedOption is required');
  if (data.selectedOption < 0 || data.selectedOption > 3)
    errors.push('selectedOption must be 0-3');
  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateVoterRegistration,
  validateFraudReport,
  validateQuizAnswer,
};
