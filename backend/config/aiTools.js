/**
 * VoterVerse — AI Service Configuration
 * Centralized function declarations for Gemini Tool calling.
 */

module.exports = [
  {
    name: 'explain_election_document',
    description:
      'Analyze a voter ID card, election notice, or official election form and explain what action the voter needs to take',
    parameters: {
      type: 'OBJECT',
      properties: {
        document_type: {
          type: 'STRING',
          description: 'Type of document: voter_card | election_notice | form | unknown',
        },
        key_information: {
          type: 'STRING',
          description: 'Most important piece of information found in the document',
        },
        required_action: {
          type: 'STRING',
          description: 'What the voter must do next based on this document',
        },
        deadline: { type: 'STRING', description: 'Any deadline mentioned in the document' },
        warning: { type: 'STRING', description: 'Any warning or risk to the voter' },
      },
      required: ['document_type', 'key_information', 'required_action'],
    },
  },
  {
    name: 'generate_quiz_question',
    description: 'Generate a multiple-choice quiz question about the Indian election process',
    parameters: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING', description: 'The quiz question' },
        options: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Four answer options' },
        correct_index: {
          type: 'NUMBER',
          description: 'Zero-based index of the correct answer (0-3)',
        },
        explanation: { type: 'STRING', description: 'Why the correct answer is right' },
      },
      required: ['question', 'options', 'correct_index', 'explanation'],
    },
  },
  {
    name: 'classify_fraud_report',
    description: 'Classify a reported suspicious election activity and recommend action',
    parameters: {
      type: 'OBJECT',
      properties: {
        fraud_type: {
          type: 'STRING',
          description:
            'Type: booth_capturing | vote_buying | impersonation | EVM_tampering | intimidation | misinformation | other',
        },
        severity: { type: 'STRING', description: 'Severity: low | medium | high | critical' },
        recommended_action: {
          type: 'STRING',
          description: 'What the reporter should do immediately',
        },
        eci_reference: {
          type: 'STRING',
          description: 'Relevant ECI guideline, helpline number, or cVIGIL app reference',
        },
      },
      required: ['fraud_type', 'severity', 'recommended_action'],
    },
  },
];
