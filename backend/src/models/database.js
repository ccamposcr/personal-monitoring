const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    const dbPath = path.join(__dirname, '../../data/users.db');
    
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => this.createDefaultAdmin())
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'regular' CHECK(role IN ('admin', 'regular')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUserAuxiliariesTable = `
      CREATE TABLE IF NOT EXISTS user_auxiliaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        auxiliary_id INTEGER NOT NULL CHECK(auxiliary_id BETWEEN 1 AND 6),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, auxiliary_id)
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createUsersTable, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
            return;
          }
        });

        this.db.run(createUserAuxiliariesTable, (err) => {
          if (err) {
            console.error('Error creating user_auxiliaries table:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  async createDefaultAdmin() {
    const hashedPassword = await bcrypt.hash('12345', 10);
    
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT id FROM users WHERE username = ?",
        ['produccion'],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            this.db.run(
              "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
              ['produccion', hashedPassword, 'admin'],
              function(err) {
                if (err) {
                  console.error('Error creating default admin:', err);
                  reject(err);
                } else {
                  console.log('✅ Default admin user created: produccion/12345');
                  resolve();
                }
              }
            );
          } else {
            console.log('Default admin user already exists');
            resolve();
          }
        }
      );
    });
  }

  async createUser(username, password, role = 'regular') {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        [username, hashedPassword, role],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              username,
              role
            });
          }
        }
      );
    });
  }

  async updateUser(id, data) {
    let query = "UPDATE users SET ";
    const values = [];
    const updates = [];

    if (data.username) {
      updates.push("username = ?");
      values.push(data.username);
    }
    
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push("password_hash = ?");
      values.push(hashedPassword);
    }
    
    if (data.role) {
      updates.push("role = ?");
      values.push(data.role);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    query += updates.join(", ") + " WHERE id = ?";
    values.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async deleteUser(id) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC",
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async getUserAuxiliaries(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT auxiliary_id FROM user_auxiliaries WHERE user_id = ?",
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => row.auxiliary_id));
          }
        }
      );
    });
  }

  async setUserAuxiliaries(userId, auxiliaryIds) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");
        
        // Clear existing auxiliaries
        this.db.run("DELETE FROM user_auxiliaries WHERE user_id = ?", [userId]);
        
        // Insert new auxiliaries
        const stmt = this.db.prepare("INSERT INTO user_auxiliaries (user_id, auxiliary_id) VALUES (?, ?)");
        
        auxiliaryIds.forEach(auxId => {
          stmt.run([userId, auxId]);
        });
        
        stmt.finalize();
        
        this.db.run("COMMIT", (err) => {
          if (err) {
            this.db.run("ROLLBACK");
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  async verifyPassword(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role
    };
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;