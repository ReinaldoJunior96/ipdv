import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import App from './App.vue'
import { createHttpClient } from './lib/http'
import { POSTOS_API_KEY, createPostosApi } from './lib/postosApi'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#17624a',
          secondary: '#dbe8df',
          background: '#f4f1e8',
          surface: '#ffffff',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(vuetify)
app.provide(POSTOS_API_KEY, createPostosApi(createHttpClient()))
app.mount('#app')
