/**
 * VoterVerse — AI Service (Gemini 1.5 Flash with Advanced Function Calling)
 *
 * Three Function Declarations:
 * 1. explain_election_document — Vision API to explain voter cards
 * 2. generate_quiz_question — Structured quiz JSON
 * 3. classify_fraud_report — Fraud type + severity classification
 *
 * Graceful fallback with mock responses when no API key is available.
 */

const logger = require('./auditLogger');

// ─── Function Declarations for Gemini ───
const functionDeclarations = [
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
        deadline: {
          type: 'STRING',
          description: 'Any deadline mentioned in the document',
        },
        warning: {
          type: 'STRING',
          description: 'Any warning or risk to the voter',
        },
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
        options: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Four answer options',
        },
        correct_index: {
          type: 'NUMBER',
          description: 'Zero-based index of the correct answer (0-3)',
        },
        explanation: {
          type: 'STRING',
          description: 'Why the correct answer is right',
        },
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
        severity: {
          type: 'STRING',
          description: 'Severity: low | medium | high | critical',
        },
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

const tools = [{ functionDeclarations }];

// ─── Mock Responses (used when no API key) ───
const MOCK_RESPONSES = {
  document: {
    document_type: 'voter_card',
    key_information:
      'EPIC (Electors Photo Identity Card) with voter serial number, constituency details, and photo identification',
    required_action:
      'Verify all details are correct. If any information is wrong, file Form 8 for correction at your nearest Electoral Registration Office or online at nvsp.in',
    deadline: 'Corrections must be filed before the final electoral roll publication date',
    warning:
      'Carry this card on polling day. Without valid photo ID, you may be denied voting rights.',
  },
  quiz: [
    {
      question: 'What is the minimum age to vote in Indian elections?',
      options: ['16 years', '18 years', '21 years', '25 years'],
      correct_index: 1,
      explanation:
        'Article 326 of the Indian Constitution sets the minimum voting age at 18 years. This was reduced from 21 years by the 61st Amendment Act, 1988.',
    },
    {
      question: 'Which body conducts elections in India?',
      options: [
        'Supreme Court of India',
        'Election Commission of India',
        'Parliament of India',
        'NITI Aayog',
      ],
      correct_index: 1,
      explanation:
        'The Election Commission of India (ECI), established under Article 324 of the Constitution, is an autonomous constitutional authority responsible for administering election processes.',
    },
    {
      question: 'What is the Model Code of Conduct?',
      options: [
        'A law passed by Parliament',
        'Guidelines for voter behavior',
        'Rules for political parties and candidates during elections',
        'A Supreme Court directive',
      ],
      correct_index: 2,
      explanation:
        'The Model Code of Conduct (MCC) is a set of guidelines issued by the ECI for political parties and candidates to ensure free and fair elections. It comes into effect from the date of announcement of elections.',
    },
    {
      question: 'What is VVPAT in the context of Indian elections?',
      options: [
        'Voter Verification and Processing Audit Trail',
        'Voter Verifiable Paper Audit Trail',
        'Virtual Voting and Processing Application Tool',
        'Voter Validated Polling Audit Technology',
      ],
      correct_index: 1,
      explanation:
        'VVPAT (Voter Verifiable Paper Audit Trail) is a machine attached to EVMs that produces a paper slip showing the symbol and name of the party voted for, allowing voters to verify their vote.',
    },
    {
      question: 'What form is used to apply for a new voter ID card?',
      options: ['Form 2', 'Form 6', 'Form 8', 'Form 11'],
      correct_index: 1,
      explanation:
        'Form 6 is used for new voter registration. Form 8 is for corrections, Form 7 for objection to inclusion, and Form 6B for Aadhaar linking.',
    },
  ],
  fraud: {
    fraud_type: 'vote_buying',
    severity: 'high',
    recommended_action:
      'Immediately report via the cVIGIL app or call the ECI helpline at 1950. Do not accept anything offered. Document evidence safely without putting yourself at risk.',
    eci_reference:
      'ECI cVIGIL App — Report with photo/video evidence. Response guaranteed within 100 minutes. Helpline: 1950',
  },
};

let quizIndex = 0;

// ─── Gemini AI Clients ───
let genAI = null;
let model = null;        // Function Calling model
let chatModel = null;    // Plain chat model (no function calling)

const CHAT_SYSTEM_PROMPT = `You are VoterBot, a friendly and knowledgeable AI assistant specializing in Indian elections. You help citizens understand:

1. **Voter Registration** — How to register (Form 6), check/correct voter ID (Form 8), EPIC card details, NVSP portal, Aadhaar linking (Form 6B)
2. **Voting Procedure** — How to vote, EVMs (Electronic Voting Machines), VVPAT verification, polling booth conduct, indelible ink, NOTA option
3. **Election Rules** — Model Code of Conduct, candidate eligibility, expenditure limits, election schedule
4. **Fraud Reporting** — cVIGIL app, ECI helpline 1950, types of election offences, legal provisions
5. **Election Timeline** — Announcement, nomination, campaigning, polling, counting, results
6. **Voter Rights** — Right to vote (Article 326), right to secret ballot, right to verify VVPAT slip

Always be accurate, helpful, and encourage civic participation. If unsure, direct users to eci.gov.in or helpline 1950.

After your answer, on a SEPARATE line starting with "SUGGESTIONS:", provide exactly 3 follow-up questions the user might want to ask, as a JSON array.
Example: SUGGESTIONS: ["How do I check my voter ID status?", "What documents do I need at the polling booth?", "Can I vote if my name is wrong on the voter list?"]

Keep your main answer concise (2-4 paragraphs). Use simple language for first-time voters.`;

function initGemini() {
  if (model) return true;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.info('No GEMINI_API_KEY — AI Service running in MOCK mode');
    return false;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools });
    chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    logger.info('Gemini AI initialized with Function Calling + Chat model');
    return true;
  } catch (err) {
    logger.error('Failed to initialize Gemini', { error: err.message });
    return false;
  }
}

// ─── Chat: parse suggestions out of streamed text ───
function parseSuggestions(text) {
  try {
    const match = text.match(/SUGGESTIONS:\s*(\[.*?\])/s);
    if (match) {
      return JSON.parse(match[1]);
    }
  } catch { /* ignore */ }
  return [
    'How do I register to vote?',
    'What ID do I need at the polling booth?',
    'How can I report election fraud?',
  ];
}

function stripSuggestions(text) {
  return text.replace(/\nSUGGESTIONS:.*$/s, '').trim();
}

// ─── Mock chat responses ───
const MOCK_CHAT_RESPONSES = {
  registration: {
    text: `To register as a voter in India, you need to follow these steps:\n\n**1. Check Eligibility**: You must be an Indian citizen aged 18 or above on the qualifying date (January 1st of the registration year).\n\n**2. Fill Form 6**: Download Form 6 from the National Voters' Service Portal (nvsp.in) or get it from your nearest Electoral Registration Office. Fill in your details including name, address, date of birth, and relationship proof.\n\n**3. Submit Documents**: Attach proof of age (birth certificate, school certificate, or passport), proof of residence (Aadhaar, utility bill, or passport), and a recent passport-size photograph.\n\n**4. Track Your Application**: After submission, you'll get an acknowledgment number to track your registration status online at nvsp.in.\n\nYou can also use the Voter Helpline App or call **1950** for assistance.`,
    suggestions: ['What documents do I need for voter registration?', 'How do I correct my voter ID details?', 'How long does voter registration take?'],
  },
  voting: {
    text: `On polling day, here's what you need to know:\n\n**Bring Valid ID**: Carry your EPIC (Voter ID card) or any of the 12 alternative photo IDs accepted by ECI (Aadhaar, PAN card, passport, driving license, etc.).\n\n**Find Your Booth**: Check your polling booth on the Voter Helpline App or at nvsp.in. Booths are open from 7 AM to 6 PM.\n\n**Voting Process**: After identity verification, your name is marked in the electoral roll and indelible ink is applied to your left index finger. You then proceed to the EVM to press the candidate's button. The VVPAT machine shows a paper slip for 7 seconds confirming your vote.\n\n**Your Rights**: Voting is confidential — no one can know who you voted for. You have the right to NOTA (None of the Above) if you don't want to vote for any candidate.`,
    suggestions: ['What is NOTA and how do I use it?', 'Can I vote if my name is spelled wrong on the list?', 'What happens if I lose my voter ID?'],
  },
  default: {
    text: `I'm VoterBot, your guide to Indian elections! I can help you with:\n\n🗳️ **Voter Registration** — How to register, correct your voter ID, or check your status\n\n📋 **Voting Procedure** — What to bring, how EVMs work, VVPAT verification\n\n🏛️ **Election Rules** — Model Code of Conduct, candidate eligibility, your voting rights\n\n🚨 **Fraud Reporting** — How to report suspicious activity via cVIGIL app or calling 1950\n\nWhat would you like to know about?`,
    suggestions: ['How do I register to vote?', 'What should I bring to the polling booth?', 'How do I report election fraud?'],
  },
  fraud: {
    text: `If you witness any election fraud like vote buying, booth capturing, or intimidation, you can report it through the following channels:\n\n**1. cVIGIL App**: Download the Election Commission's cVIGIL app. It allows you to take a photo or video and report violations instantly. The team is required to respond within 100 minutes.\n\n**2. Voter Helpline**: Call the toll-free number **1950** to report issues directly to election officials.\n\n**3. Returning Officer**: You can submit a written complaint to the Returning Officer of your constituency.`,
    suggestions: ['What is the cVIGIL app?', 'Is my identity kept secret if I report fraud?', 'What are the penalties for vote buying?'],
  },
};

function getMockChatKey(message, topic) {
  const lower = message.toLowerCase();
  let key = 'default';

  if (topic === 'registration' || lower.includes('register') || lower.includes('voter id') || lower.includes('form 6')) {
    key = 'registration';
  } else if (topic === 'voting' || lower.includes('polling') || lower.includes('vote') || lower.includes('booth') || lower.includes('evm') || lower.includes('vvpat')) {
    key = 'voting';
  } else if (topic === 'fraud' || lower.includes('fraud') || lower.includes('cvigil') || lower.includes('report') || lower.includes('offence')) {
    key = 'fraud';
  } else if (lower.includes('hello') || lower.includes('hi')) {
    key = 'default';
  }
  
  return MOCK_CHAT_RESPONSES[key] ? key : 'default';
}

/**
 * Stream a chat response from Gemini with conversation history
 * Yields text chunks as they arrive, then a suggestions chunk
 */
async function* streamChatResponse(message, history = [], topic = '') {
  initGemini();

  // Mock mode fallback
  if (!chatModel) {
    const key = getMockChatKey(message, topic);
    const mock = MOCK_CHAT_RESPONSES[key];
    // Simulate streaming by yielding words progressively
    const words = mock.text.split(' ');
    for (let i = 0; i < words.length; i += 5) {
      yield { type: 'text', chunk: words.slice(i, i + 5).join(' ') + ' ' };
      await new Promise(r => setTimeout(r, 30));
    }
    yield { type: 'suggestions', suggestions: mock.suggestions };
    return;
  }

  try {
    // Build chat history in Gemini format
    const contents = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    let userText = message;
    if (topic) {
      userText = `[Topic: ${topic}] ${message}`;
    }
    
    // Inject system prompt into the first message of the conversation
    if (contents.length === 0) {
      userText = `System Instruction (Follow this strictly): ${CHAT_SYSTEM_PROMPT}\n\nUser Question: ${userText}`;
    }

    contents.push({ role: 'user', parts: [{ text: userText }] });

    // Use standard generateContent instead of streamGenerateContent to avoid 404 API error
    const result = await chatModel.generateContent({ contents });
    const fullText = result.response.text();

    const mainText = stripSuggestions(fullText);
    yield { type: 'text', chunk: mainText };

    const suggestions = parseSuggestions(fullText);
    yield { type: 'suggestions', suggestions };

    logger.info('Chat response streamed', { topic, historyLength: history.length });
  } catch (err) {
    logger.error('Chat streaming failed, falling back to mock', { error: err.message });
    
    // Fallback to mock responses seamlessly
    const key = getMockChatKey(message, topic);
    const mock = MOCK_CHAT_RESPONSES[key];
    
    const words = mock.text.split(' ');
    for (let i = 0; i < words.length; i += 5) {
      yield { type: 'text', chunk: words.slice(i, i + 5).join(' ') + ' ' };
      await new Promise(r => setTimeout(r, 30));
    }
    yield { type: 'suggestions', suggestions: mock.suggestions };
  }
}

// ─── Extract function call result from Gemini response ───
function extractFunctionCall(response, expectedName) {
  try {
    const candidate = response.response.candidates[0];
    const parts = candidate.content.parts;
    for (const part of parts) {
      if (part.functionCall && part.functionCall.name === expectedName) {
        return part.functionCall.args;
      }
    }
    // If no function call, try to parse text response
    const text = response.response.text();
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

// ─── Public API ───

/**
 * Analyze an election document using Gemini Vision
 * PRIVACY: Image processed in-memory only, never stored or logged
 */
async function analyzeElectionDocument(base64Image, mimeType = 'image/jpeg') {
  initGemini();

  if (!model) {
    logger.info('Mock: analyzeElectionDocument called');
    return { ...MOCK_RESPONSES.document, _mock: true };
  }

  try {
    const prompt = `You are an Indian election process expert. Analyze this election-related document (voter ID card, election notice, or form). 
Use the explain_election_document function to provide:
- The document type
- The key information found
- What action the voter needs to take
- Any deadline mentioned
- Any warning or risk to the voter
Be specific and helpful. Use simple language a first-time voter would understand.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const fnResult = extractFunctionCall(result, 'explain_election_document');
    if (fnResult) return fnResult;

    // Fallback: return text as key_information
    const text = result.response.text();
    return {
      document_type: 'unknown',
      key_information: text,
      required_action: 'Please review the document details above and take appropriate action.',
    };
  } catch (err) {
    logger.error('Gemini Vision analysis failed', { error: err.message });
    return { ...MOCK_RESPONSES.document, _fallback: true, _error: err.message };
  }
}

/**
 * Generate a quiz question about election process
 */
async function generateQuizQuestion(topic = 'general') {
  initGemini();

  if (!model) {
    logger.info('Mock: generateQuizQuestion called', { topic });
    const q = MOCK_RESPONSES.quiz[quizIndex % MOCK_RESPONSES.quiz.length];
    quizIndex++;
    return { ...q, _mock: true };
  }

  try {
    const prompt = `You are an Indian election education expert. Generate a quiz question about: "${topic}".
Use the generate_quiz_question function to create a multiple-choice question with exactly 4 options.
Topics can include: voter registration, voting rights, election commission, election ethics, EVM machines, VVPAT, Model Code of Conduct, counting process, NOTA, etc.
Make it educational and accurate. Vary difficulty from easy to moderate.`;

    const result = await model.generateContent(prompt);
    const fnResult = extractFunctionCall(result, 'generate_quiz_question');
    if (fnResult) {
      // Ensure options is array of 4
      if (Array.isArray(fnResult.options) && fnResult.options.length >= 4) {
        fnResult.options = fnResult.options.slice(0, 4);
      }
      return fnResult;
    }

    // Fallback to mock
    const q = MOCK_RESPONSES.quiz[quizIndex % MOCK_RESPONSES.quiz.length];
    quizIndex++;
    return { ...q, _fallback: true };
  } catch (err) {
    logger.error('Gemini quiz generation failed', { error: err.message });
    const q = MOCK_RESPONSES.quiz[quizIndex % MOCK_RESPONSES.quiz.length];
    quizIndex++;
    return { ...q, _fallback: true, _error: err.message };
  }
}

/**
 * Classify a fraud report
 */
async function classifyFraudReport(description) {
  initGemini();

  if (!model) {
    logger.info('Mock: classifyFraudReport called');
    return { ...MOCK_RESPONSES.fraud, _mock: true };
  }

  try {
    const prompt = `You are an Indian election fraud detection expert. A citizen reports the following suspicious activity:

"${description}"

Use the classify_fraud_report function to classify this report:
- Determine the fraud type (booth_capturing, vote_buying, impersonation, EVM_tampering, intimidation, misinformation, or other)
- Assess severity (low, medium, high, critical)
- Recommend immediate action for the reporter
- Provide relevant ECI reference or helpline

Be precise and helpful. The reporter's safety is paramount.`;

    const result = await model.generateContent(prompt);
    const fnResult = extractFunctionCall(result, 'classify_fraud_report');
    if (fnResult) return fnResult;

    return { ...MOCK_RESPONSES.fraud, _fallback: true };
  } catch (err) {
    logger.error('Gemini fraud classification failed', { error: err.message });
    return { ...MOCK_RESPONSES.fraud, _fallback: true, _error: err.message };
  }
}

module.exports = {
  analyzeElectionDocument,
  generateQuizQuestion,
  classifyFraudReport,
  streamChatResponse,
  tools,
  functionDeclarations,
  MOCK_RESPONSES,
};
