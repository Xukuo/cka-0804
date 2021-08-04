const webpack = require('webpack')
const configuration = require('../config/webpack.dev')
const recursive = require('recursive-readdir')
const path = require('path')
const envfile = require('./env')
const Client = require('./client')
const config = require('./config')
const logger = require('./logger')

const ignore = (file, stats) => stats.isFile() && path.extname(file) !== '.js' && path.extname(file) !== '.css'

const watch = async () => {
  logger.info('Start compiling.......')
  let hash
  const env = await envfile.load(config.envfile)
  const client = new Client(env[config.envBaseURL], env[config.envUserName], env[config.envPassword])

  configuration.watch = true
  configuration.watchOptions = { aggregateTimeout: 200, poll: 1000, ignored: /node_modules/ }

  webpack(configuration, async (err, stats) => {
    if (err || stats.hasErrors()) {
      console.error(
        err ||
          stats.toString({
            colors: true,
          }),
      )
    } else if (hash !== stats.hash) {
      hash = stats.hash
      console.log(
        stats.toString({
          colors: true,
        }),
      )
      await client.customizeFiles(env[config.envAppID], await recursive(config.outputDir, [ignore]), config.customize)
    }
  })
}

watch()
