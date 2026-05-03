/**
 * VoterVerse — Database Abstraction Layer
 * Supports Firebase Realtime Database and In-Memory fallback.
 */

const admin = require('firebase-admin');
const logger = require('./auditLogger');
const constants = require('./config/constants');
const ELECTION_TIMELINE = require('./config/timeline.json');

/**
 * InMemoryDB Provider
 * Implementation for development or fallback scenarios.
 */
class InMemoryDB {
  constructor() {
    this.reports = new Map();
    this.conversations = new Map();
    this.timeline = ELECTION_TIMELINE;
    logger.info('Database initialized in MEMORY mode');
  }

  /**
   * Saves a fraud report to memory.
   * @param {string} id - Unique report ID
   * @param {object} report - Report details
   * @returns {Promise<string>} The report ID
   */
  async saveReport(id, report) {
    this.reports.set(id, { ...report, id, createdAt: new Date().toISOString() });
    return id;
  }

  /**
   * Fetches all reports from memory.
   * @returns {Promise<array>} Array of reports
   */
  async getReports() {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * Fetches the election timeline.
   * @returns {Promise<array>} Array of timeline steps
   */
  async getTimeline() {
    return this.timeline;
  }

  /**
   * Fetches conversation history.
   * @param {string} sessionId
   * @returns {Promise<array>} Array of messages
   */
  async getConversation(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  /**
   * Appends a message to a conversation.
   * @param {string} sessionId
   * @param {object} message
   * @returns {Promise<array>} Updated history
   */
  async appendMessage(sessionId, message) {
    const history = await this.getConversation(sessionId);
    history.push({ ...message, timestamp: new Date().toISOString() });
    // Cap history
    if (history.length > constants.AI.MAX_CHAT_HISTORY * 2) {
      history.splice(0, history.length - constants.AI.MAX_CHAT_HISTORY * 2);
    }
    this.conversations.set(sessionId, history);
    return history;
  }

  /**
   * Clears a conversation.
   * @param {string} sessionId
   */
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
class FirebaseDB {
  constructor() {
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
    return Object.values(val).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    if (history.length > constants.AI.MAX_CHAT_HISTORY * 2) {
      history.splice(0, history.length - constants.AI.MAX_CHAT_HISTORY * 2);
    }
    await this.db.ref(`conversations/${sessionId}`).set(history);
    return history;
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
