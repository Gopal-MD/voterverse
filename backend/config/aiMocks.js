/**
 * VoterVerse — AI Mock Responses
 * Used when GEMINI_API_KEY is not configured or in development mode.
 */

module.exports = {
  document: {
    document_type: 'voter_card',
    key_information: 'Voter Name: Rajesh Kumar, Part No: 142, Serial No: 89',
    required_action: 'Bring this original card to Polling Booth #42 on Election Day.',
    deadline: 'Voting Day (7 AM - 6 PM)',
    warning: 'Keep this document safe; do not share its QR code with unauthorized persons.',
  },
  quiz: [
    {
      question: 'What is the minimum age to vote in India?',
      options: ['16 years', '18 years', '21 years', '25 years'],
      correct_index: 1,
      explanation: 'The 61st Amendment Act of 1988 lowered the voting age from 21 to 18 years.',
    },
    {
      question: 'Which machine is used to provide a paper audit trail for voters?',
      options: ['EVM', 'VVPAT', 'Aadhar Card', 'Scanner'],
      correct_index: 1,
      explanation:
        'VVPAT (Voter Verifiable Paper Audit Trail) allows voters to verify that their vote was cast correctly.',
    },
  ],
  fraud: {
    fraud_type: 'misinformation',
    severity: 'medium',
    recommended_action:
      'Verify information via the official ECI website and do not share forward the message.',
    eci_reference: 'ECI Myth vs Reality Register (ECI Website)',
  },
};
