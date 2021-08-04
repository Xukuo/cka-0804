const webpack = require('webpack')
const devcert = require('devcert')
const WebpackDevServer = require('webpack-dev-server')
const configuration = require('../config/webpack.dev')
const envfile = require('./env')
const Client = require('./client')
const config = require('./config')
const logger = require('./logger')

const devServer = {
  host: 'localhost',
  port: config.port,
  contentBase: config.outputDir,
  stats: 'errors-only',
  clientLogLevel: 'silent',
  compress: true,
  disableHostCheck: true,
  https: true,
}

const setCert = async () => {
  try {
    const { key, cert } = await devcert.certificateFor(config.domain)
    devServer.key = key
    devServer.cert = cert
    devServer.host = config.domain
    return true
  } catch (err) {
    if (err.message) logger.error(err.message)
    logger.warn('Unable to create a certificate, the server will run in non-secure certificate mode.')
    return false
  }
}

const main = async () => {
  if (!devServer.https) throw new Error('The URL must start with "https://".')
  logger.info('Start dev server.......')
  // https://github.com/webpack/webpack-dev-server/issues/2758
  configuration.target = 'web'

  const compiler = webpack(configuration)

  const secure = await setCert()

  const env = await envfile.load(config.envfile)
  const client = new Client(env[config.envBaseURL], env[config.envUserName], env[config.envPassword])

  const server = new WebpackDevServer(compiler, devServer)
  server.listen(devServer.port, devServer.host, async () => {
    const port = devServer.port === 443 ? '' : `:${devServer.port}`
    if (!secure) {
      logger.warn('As a non-secure certificate is used, please verify before debugging.')
      logger.warn(`Please click -> https://${devServer.host}${port}/`)
    }

    const url = new URL(configuration.output.filename, `https://${devServer.host}${port}`).href
    await client.customizeLinks(
      env[config.envAppID],
      config.outputJS.map((file) => url.replace('[name]', file)),
      config.customize,
    )
  })
}

main()
