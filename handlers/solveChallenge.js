const fs = require('fs')
const path = require('path')
const { createFolder, generateSubmission, getExtension, compile } = require('../lib')

const database = require('../database')

module.exports = (req, res, next) => {

  const Joi = require('joi')
  const data = req.body
  const schema = Joi.object().keys({
      id: Joi.number().required(),
      lang: Joi.valid('String', ['java', 'python']).required(),
      submission: Joi.string().required(),
  })
  Joi.validate(data, schema, async (err, value) => {
    if (err) {
      res.status(422).json({
        status: 'error',
        message: 'Invalid request data',
        data: data
      })
    } else {
      const userID = req.user.id
      const { id, lang, submission } = value
      const challenge = await database.getChallenge(id)
      const directory = path.join(__dirname, '../users')
      await createFolder(directory)
    
      const container = path.join(directory, `${req.user.id}`)
      await createFolder(container)
    
      const file = path.join(container, `/Challenge_${challenge.number}.${getExtension(lang)}`)
    
      await fs.writeFileSync(file, generateSubmission(lang, challenge, submission))

      const { result: response, code } = await compile(lang, file).catch(err => console.log(err))
      console.log(code, response)
      if (code === 0) {
        const results = JSON.parse('[' + response.trim().replace(/\n/g, ',') + ']')
        await database.addSubmission({
          id: userID,
          number: challenge.number,
          code: submission,
          score: results.filter(result => result.payload.value).length
        })
        res.json({ results, code })
      } else if (code == 1) {
        res.json({ error: "unknown error.", code })
      }
    }
  })
}