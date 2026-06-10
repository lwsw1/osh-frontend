<template>
  <n-cascader
    v-model:value="selectedPath"
    :options="options"
    placeholder="请选择资源"
    :render-label="renderLabel"
    filterable
    class="wide-cascader"
    clearable
    multiple
    value-type="path"
     @change="handleChange"
  />
</template>

<script setup>
import { ref, h } from 'vue'
import { NCascader, NTooltip } from 'naive-ui'

const props = defineProps({
    modelValue: Array
})

// 选中值：数组，对应每一级的 value
const selectedPath = ref(props.modelValue.map(item => item[item.length - 1]))
// 级联数据
const options = ref([])

onMounted(() => {
  useSiteResourceOptions().then(response => {
    options.value = response.data.value
    // console.log('获取资源选项成功:', options.value)
  }).catch(error => {
      console.error('获取资源选项失败:', error)
  })
})

const renderLabel = (option) => {
  return h(NTooltip, {
    placement: 'top',
    trigger: 'hover'
  }, {
    trigger: () => {

    const width = '180px'
    if (option.children && option.children.length === 0) {
      width = '400px'
    } 
    return  h('span', {
      style: {
        width: width,
        maxWidth: width,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'inline-block'
      }
    }, option.label)
  },
    default: () => option.label
  })
}

const emit = defineEmits(["update:modelValue"])

// 4. 选择回调（能拿到父级！）
const handleChange = (leaves) => {
  // console.log('组件返回的叶子ID：', leaves)

  // 关键：获取完整路径（含父级）
  const { valuePaths, labelPaths } = findFullPaths(leaves, options.value)
  // console.log('完整 value 路径(父级+子级)', valuePaths)
  // console.log('完整 label 路径(父级+子级)', labelPaths)

  emit("update:modelValue", valuePaths)

  // 父级ID / 父级名称
  // const parentIds = valuePaths.map(item => item[0])
  // const parentNames = labelPaths.map(item => item[0])

  // console.log('所有父级ID：', parentIds)
  // console.log('所有父级名称：', parentNames)
}


// 根据叶子ID 递归查找 完整路径（父级+自己）
function findFullPaths(leaves, opts) {
  const valuePaths = []
  const labelPaths = []
  function dfs(list, target, valPath, labPath) {
    for (const item of list) {
      valPath.push(item.value)
      labPath.push(item.label)
      if (item.value === target) {
        valuePaths.push([...valPath])
        labelPaths.push([...labPath])
        return true
      }

      if (item.children && dfs(item.children, target, valPath, labPath)) {
        return true
      }
      valPath.pop()
      labPath.pop()
    }
    return false
  }

  leaves.forEach(leaf => {
    dfs(opts, leaf, [], [])
  })

  return { valuePaths, labelPaths }
}


</script>