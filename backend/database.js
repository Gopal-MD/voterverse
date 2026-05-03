/**
 * VoterVerse — Database Abstraction Layer
 * Supports Firebase Realtime Database and In-Memory fallback.
 */

const admin = require('firebase-admin');
const logger = require('./auditLogger');
const constants = require('./config/constants');
const ELECTION_TIMELINE = require('./config/timeline.json');

/**
 * Base Database Provider with common operations.
 */
class BaseDB {
  /**
   * Sort reports by creation date (newest first).
   * @param {array} reports - Reports to sort
   * @returns {array} Sorted reports
   */
  sortReportsByDate(reports) {
    return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Trim conversation history to max length.
   * @param {array} history - Conversation history
   * @returns {array} Trimmed history
   */
  trimConversationHistory(history) {
    const maxLen = constants.AI.MAX_CHAT_HISTORY * 2;
    if (history.length > maxLen) {
      return history.slice(-maxLen);
    }
    return history;
  }
}

/**
 * InMemoryDB Provider
 * Implementation for development or fallback scenarios.
 */
class InMemoryDB extends BaseDB {
  constructor() {
    super();
    this.reports = new Map();
    this.conversations = new Map();
    this.timeline = ELECTION_TIMELINE;
    logger.info('Database initialized in MEMORY mode');
  }

  async saveReport(id, report) {
    this.reports.set(id, { ...report, id, createdAt: new Date().toISOString() });
    return id;
  }

  async getReports() {
    return this.sortReportsByDate(Array.from(this.reports.values()));
  }

  async getTimeline() {
    return this.timeline;
  }

  async getConversation(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  async appendMessage(sessionId, message) {
    const history = await this.getConversation(sessionId);
    history.push({ ...message, timestamp: new Date().toISOString() });
    const trimmed = this.trimConversationHistory(history);
    this.conversations.set(sessionId, trimmed);
    return trimmed;
  }

  async clearConversation(sessionId) {
    this.conversations.delete(sessionId);
  }

  getMode() {
    return 'memory';
  }
}

/**
 * FirebaseDB Provider
 * Production-ready implementation using Firebase Admin SDK.
 */
class FirebaseDB extends BaseDB {
  constructor() {
    super();
    this.db = admin.database();
    logger.info('Database initialized in FIREBASE mode');
  }

  async saveReport(id, report) {
    const ref = this.db.ref(`reports/${id}`);
    const data = { ...report, id, createdAt: new Date().toISOString() };
    await ref.set(data);
    return id;
  }

  async getReports() {
    const ref = this.db.ref('reports');
    const snapshot = await ref.once('value');
    const val = snapshot.val() || {};
    return this.sortReportsByDate(Object.values(val));
  }

  async getTimeline() {
    const ref = this.db.ref('timeline');
    const snapshot = await ref.once('value');
    const val = snapshot.val();
    return val || ELECTION_TIMELINE;
  }

  async getConversation(sessionId) {
    const ref = this.db.ref(`conversations/${sessionId}`);
    const snapshot = await ref.once('value');
    return snapshot.val() || [];
  }

  async appendMessage(sessionId, message) {
    const history = await this.getConversation(sessionId);
    history.push({ ...message, timestamp: new Date().toISOString() });
    const trimmed = this.trimConversationHistory(history);
    await this.db.ref(`conversations/${sessionId}`).set(trimmed);
    return trimmed;
  }

  async clearConversation(sessionId) {
    await this.db.ref(`conversations/${sessionId}`).remove();
  }

  getMode() {
    return 'firebase';
  }
}

let instance;
try {
  if (process.env.FIREBASE_PROJECT_ID && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
    });
    instance = new FirebaseDB();
  } else {
    instance = new InMemoryDB();
  }
} catch (err) {
  logger.warn('Firebase init failed, falling back to memory', { error: err.message });
  instance = new InMemoryDB();
}

module.exports = instance;
