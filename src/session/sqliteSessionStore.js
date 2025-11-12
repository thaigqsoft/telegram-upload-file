const session = require('express-session');

class SQLiteSessionStore extends session.Store {
  /**
   * @param {Object} options
   * @param {import('sqlite3').Database} options.db
   * @param {number} [options.ttl] - Session time-to-live in ms
   * @param {number} [options.cleanupInterval] - Cleanup interval in ms
   * @param {number} [options.historyTTL] - How long to preserve expired sessions before pruning
   */
  constructor(options = {}) {
    super();

    if (!options.db) {
      throw new Error('SQLiteSessionStore requires a database instance');
    }

    this.db = options.db;
    this.ttl = typeof options.ttl === 'number' ? options.ttl : 24 * 60 * 60 * 1000; // default 1 day
    this.cleanupInterval = typeof options.cleanupInterval === 'number'
      ? options.cleanupInterval
      : 60 * 60 * 1000; // default 1 hour
    this.historyTTL = typeof options.historyTTL === 'number'
      ? options.historyTTL
      : 30 * 24 * 60 * 60 * 1000; // default 30 days

    this._startCleanupTimer();
  }

  _startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.pruneExpiredSessions();
    }, this.cleanupInterval);

    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  pruneExpiredSessions() {
    const threshold = Date.now() - this.historyTTL;
    this.db.run(
      `DELETE FROM auth_sessions WHERE (expire <= ? AND logout_at IS NOT NULL) OR expire <= ?`,
      [Date.now(), threshold],
      (err) => {
        if (err) {
          console.error('Failed to prune expired sessions:', err.message);
        }
      }
    );
  }

  get(sid, callback = () => {}) {
    this.db.get(
      `SELECT sess FROM auth_sessions WHERE sid = ? AND expire > ? LIMIT 1`,
      [sid, Date.now()],
      (err, row) => {
        if (err) {
          callback(err);
          return;
        }

        if (!row || !row.sess) {
          callback();
          return;
        }

        try {
          const sessionData = JSON.parse(row.sess);
          callback(null, sessionData);
        } catch (parseError) {
          callback(parseError);
        }
      }
    );
  }

  set(sid, sess, callback = () => {}) {
    const expires = this._getExpiration(sess);
    let serialized;

    try {
      serialized = JSON.stringify(sess);
    } catch (err) {
      callback(err);
      return;
    }

    const username = sess?.username || null;
    const ipAddress = sess?.ipAddress || null;
    const userAgent = sess?.userAgent || null;

    this.db.run(
      `INSERT INTO auth_sessions (sid, sess, expire, username, ip_address, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(sid)
       DO UPDATE SET
         sess = excluded.sess,
         expire = excluded.expire,
         username = excluded.username,
         ip_address = excluded.ip_address,
         user_agent = excluded.user_agent,
         updated_at = CURRENT_TIMESTAMP,
         logout_at = NULL`,
      [sid, serialized, expires, username, ipAddress, userAgent],
      callback
    );
  }

  destroy(sid, callback = () => {}) {
    const now = Date.now();
    this.db.run(
      `UPDATE auth_sessions
         SET logout_at = CURRENT_TIMESTAMP,
             expire = ?,
             sess = '{}',
             updated_at = CURRENT_TIMESTAMP
       WHERE sid = ?`,
      [now, sid],
      (err) => {
        callback(err);
      }
    );
  }

  touch(sid, sess, callback = () => {}) {
    const expires = this._getExpiration(sess);
    this.db.run(
      `UPDATE auth_sessions
         SET expire = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE sid = ?`,
      [expires, sid],
      callback
    );
  }

  _getExpiration(sess) {
    if (sess?.cookie?.expires) {
      const expires = new Date(sess.cookie.expires).getTime();
      if (!Number.isNaN(expires)) {
        return expires;
      }
    }
    return Date.now() + this.ttl;
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

module.exports = SQLiteSessionStore;

