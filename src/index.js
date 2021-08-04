import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import App from './App.vue'

const { KintoneRestAPIClient } = require('@kintone/rest-api-client')

const client = new KintoneRestAPIClient({
  baseUrl: process.env.BASE_URL,
  auth: {
    name: process.env.USER_NAME,
    password: process.env.PASSWORD,
  },
})
kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
  const { record } = event
  const myContainer = document.getElementById('user-js-batch')
  Vue.config.productionTip = false
  Vue.prototype.$kintone = kintone
  Vue.prototype.$record = record
  Vue.prototype.$client = client
  Vue.use(ElementUI)
  new Vue({
    render: (h) => h(App),
  }).$mount(myContainer)
  return event
})
