<!-- 
  用户选择器
-->
<template>
    <n-select v-model:value="value" :options="userOptions" placeholder="选择用户" multiple @change="handleSelectChange"/>
</template>
<script lang='ts' setup>
import {
    NSelect
} from 'naive-ui'
import { ref } from 'vue'

const props = defineProps({
    modelValue: Array<number>
})

const value = ref(props.modelValue)
const userOptions = ref([])

onMounted(() => {
  useListAllUserApi().then((res : any) => {
    userOptions.value = res.data.value.map((user : any) => ({
      label: user.username,
      value: user.id,
    }))
  })
})

const emit = defineEmits(["update:modelValue"])

function handleSelectChange(value : any) {
  // 处理选择变化的逻辑
      // 适配后台文件上传接口的返回值
    emit("update:modelValue", value)
}

</script>
<style lang="scss" scoped>
</style>

