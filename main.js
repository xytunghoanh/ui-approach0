import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './app.vue'

import 'primevue/resources/primevue.min.css'
import 'primeflex/primeflex.css'

import InputSwitch from 'primevue/inputswitch'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Sidebar from 'primevue/sidebar'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Carousel from 'primevue/carousel'

const app = createApp(App)
app.use(PrimeVue)

app.component('InputSwitch', InputSwitch)
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Sidebar', Sidebar)
app.component('TabView', TabView)
app.component('TabPanel', TabPanel)
app.component('ProgressSpinner', ProgressSpinner)
app.component('ProgressBar', ProgressBar)
app.component('Tag', Tag)
app.component('Carousel', Carousel)

app.mount('#app')
