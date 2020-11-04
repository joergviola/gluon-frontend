import Vue from 'vue'
import VueI18n from 'vue-i18n'
import App from './gl-app.vue'
import createRouter from './gl-router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import _ from 'lodash'
import elementLocale from 'element-ui/lib/locale/lang/de'
import 'gluon-ui/gl-filters' 
import langDE from 'gluon-ui/lang/de' 
import langEN from 'gluon-ui/lang/en' 
import moment from 'moment'
import api from 'gluon-api'

export default async function init(options) {
  options = Object.assign({
    routes: [],
    locale: "de",
    messages: {},
  }, options)

  api.localHost = options.localHost

  Vue.prototype.$api = api
  Vue.prototype._ = _

  Vue.use(VueI18n)
  
  Vue.use(ElementUI, {
    locale: elementLocale,
    size: 'small'
  });
  
  const router = createRouter(options.routes)
  
  const i18n = new VueI18n({
    locale: options.locale,
    
    messages: _.merge({
      'de': langDE,
      'en': langEN,
    }, options.messages)
  })
  moment.locale(options.locale);
  
  await api.checkLogin()

  return {
    router,
    i18n,
    App
  }
}

