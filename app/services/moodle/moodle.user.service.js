
const MoodleService = require("./moodle.class.service")
const opts_def = { closeOnEnd: true }
class UserMoodleService extends MoodleService {
  async getUserByMoodleId(id, opts = opts_def) {
    const { TABLE_PREFIX } = this
    const sql = `
      SELECT *
      FROM ${TABLE_PREFIX}user user
      WHERE user.id = ?  AND user.deleted=0
      LIMIT 1 
    `
    const user = await super.execute(sql, [id], opts)
    return user[0]
  }

  async getUserByEmail(id, opts = opts_def) {
    const { TABLE_PREFIX } = this
    const sql = `
      SELECT *
      FROM ${TABLE_PREFIX}user user
      WHERE user.email = ? AND user.deleted=0
      LIMIT 1 
    `
    const user = await super.execute(sql, [id], opts)
    return user[0]
  }



}

module.exports = UserMoodleService