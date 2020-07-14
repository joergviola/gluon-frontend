<template>
   <div style="display: flex; flex-direction: column; height: 100%; background-color:#666666">
      <router-menu />
      <router-menu :bottom="true" />
      <div style="text-align: center; font-size: 70%; padding-bottom: 10px">
         <router-link to="/version"><span>gluon 08.07.20</span></router-link>
      </div>
   </div>
</template>

<script>
import RouterMenu from './gl-routerMenu'

export default {
    name: "Sidebar",
    components: {RouterMenu},
}
</script>