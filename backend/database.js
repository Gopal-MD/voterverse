/**
 * VoterVerse — Database Abstraction Layer (Provider Pattern)
 * Firebase Realtime Database when credentials exist, in-memory fallback otherwise.
 * Seamlessly switches without code changes.
 */

const logger = require('./auditLogger');

// ─── Election Timeline Data (pre-seeded) ───
const ELECTION_TIMELINE = [
  {
    step: 1,
    title: 'Election Announcement',
    description: 'The Election Commission of India (ECI) announces the election schedule, including key dates for nominations, campaigning, and voting. The Model Code of Conduct comes into effect immediately.',
    icon: '📢',
    date: 'T-45 days',
    details: 'The announcement includes constituency delimitation, reservation status, and the number of phases. All political parties must adhere to the Model Code of Conduct from this point forward.',
  },
  {
    step: 2,
    title: 'Voter Roll Revision',
    description: 'Electoral rolls are updated. Citizens can check their registration, apply for new voter IDs (Form 6), or request corrections (Form 8). Special camps are organized.',
    icon: '📋',
    date: 'T-40 days',
    details: 'Booth Level Officers (BLOs) conduct door-to-door surveys. Citizens aged 18+ on the qualifying date can register. Photo voter slips are distributed.',
  },
  {
    step: 3,
    title: 'Nomination Filing',
    description: 'Candidates file nomination papers with the Returning Officer. Each candidate must submit required documents, security deposit, and declare criminal cases and assets.',
    icon: '📝',
    date: 'T-30 days',
    details: 'Candidates need proposers from the constituency. Affidavits declaring criminal history, assets, liabilities, and educational qualifications are mandatory under Section 33A.',
  },
  {
    step: 4,
    title: 'Scrutiny & Withdrawal',
    description: 'Returning Officers scrutinize nominations for validity. Candidates with rejected nominations can appeal. Final list of contesting candidates is published after withdrawal deadline.',
    icon: '🔍',
    date: 'T-25 days',
    details: 'Common rejection reasons: incomplete forms, insufficient proposers, disqualification under RPA 1951. Candidates may withdraw by filing Form 5.',
  },
  {
    step: 5,
    title: 'Campaign Period',
    description: 'Political campaigning through rallies, advertisements, door-to-door canvassing, and social media. Campaigning must stop 48 hours before polling (silence period).',
    icon: '📣',
    date: 'T-20 to T-2 days',
    details: 'Expenditure limits apply. ECI monitors paid news, hate speech, and social media violations. CCTV and videography teams are deployed at sensitive booths.',
  },
  {
    step: 6,
    title: 'Polling Day',
    description: 'Voters cast their ballots using Electronic Voting Machines (EVMs) at designated polling stations. VVPAT machines provide a paper audit trail for voter verification.',
    icon: '🗳️',
    date: 'Election Day',
    details: 'Polling is held from 7 AM to 6 PM typically. Voters need valid photo ID. Indelible ink is applied to prevent duplicate voting. Presiding Officers manage each booth.',
  },
  {
    step: 7,
    title: 'Counting & Results',
    description: 'Votes are counted at designated counting centers under tight security. Results are declared constituency-by-constituency and published on the ECI website in real-time.',
    icon: '📊',
    date: 'T+3 days (typically)',
    details: 'Counting begins with postal ballots, followed by EVM rounds. VVPAT slips are verified for randomly selected booths (5 per constituency). Winning candidates receive certificates.',
  },
];

// ─── In-Memory Storage ───
class InMemoryDB {
  constructor() {
    this.reports = new Map();
    this.quizSessions = new Map();
    this.timeline = ELECTION_TIMELINE;
    logger.info('Database initialized in MEMORY mode');
  }

  async saveReport(id, report) {
    this.reports.set(id, { ...report, id, createdAt: new Date().toISOString() });
    return id;
  }

  async getReports() {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async getTimeline() {
    return this.timeline;
  }

  async saveQuizSession(id, session) {
    this.quizSessions.set(id, { ...session, id, createdAt: new Date().toISOString() });
    return id;
  }

  async getQuizSession(id) {
    return this.quizSessions.get(id) || null;
  }

  getMode() {
    return 'memory';
  }
}

// ─── Firebase Provider ───
class FirebaseDB {
  constructor(admin, dbUrl) {
    this.db = admin.database();
    logger.info('Database initialized in FIREBASE mode', { databaseURL: dbUrl });
  }

  async saveReport(id, report) {
    await this.db.ref(`reports/${id}`).set({ ...report, id, createdAt: new Date().toISOString() });
    return id;
  }

  async getReports() {
    const snapshot = await this.db.ref('reports').orderByChild('createdAt').once('value');
    const reports = [];
    snapshot.forEach((child) => {
      reports.push(child.val());
    });
    return reports.reverse();
  }

  async getTimeline() {
    try {
      // Timeout after 5s to avoid hanging if RTDB is slow or empty
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firebase timeline fetch timeout')), 5000)
      );
      const fetchPromise = this.db.ref('timeline').once('value');
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      const data = snapshot.val();
      if (data && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      logger.warn('Failed to fetch timeline from Firebase, using default', { error: err.message });
    }
    // Seed timeline into Firebase for next time
    try {
      await this.db.ref('timeline').set(ELECTION_TIMELINE);
      logger.info('Timeline seeded to Firebase');
    } catch (seedErr) {
      logger.warn('Could not seed timeline to Firebase', { error: seedErr.message });
    }
    return ELECTION_TIMELINE;
  }

  async saveQuizSession(id, session) {
    await this.db.ref(`quizSessions/${id}`).set({ ...session, id, createdAt: new Date().toISOString() });
    return id;
  }

  async getQuizSession(id) {
    const snapshot = await this.db.ref(`quizSessions/${id}`).once('value');
    return snapshot.val();
  }

  getMode() {
    return 'firebase';
  }
}

// ─── Factory: create the right provider ───
function createDatabase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (projectId && clientEmail && privateKey && databaseURL) {
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
          databaseURL,
        });
      }
      return new FirebaseDB(admin, databaseURL);
    } catch (err) {
      logger.error('Firebase initialization failed, falling back to memory', { error: err.message });
      return new InMemoryDB();
    }
  }

  return new InMemoryDB();
}

// Export singleton
const db = createDatabase();
module.exports = db;
module.exports.ELECTION_TIMELINE = ELECTION_TIMELINE;
