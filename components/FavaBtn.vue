<template>
    <n-button
      strong
      secondary
      :type="is_fava ? 'error' : 'tertiary'"
      size="small"
      :loading="loading"
      :title="is_fava ? '取消收藏' : '收藏'"
      @click="handleFava"
    >
      <template #icon>
        <n-icon :component="is_fava ? Heart : HeartOutline" />
      </template>
      {{ is_fava ? '已收藏' : '收藏' }}
    </n-button>
</template>
<script setup>
    import {
        NButton,
        NIcon,
        createDiscreteApi
    } from "naive-ui"
    import { Heart, HeartOutline } from '@vicons/ionicons5'
    import { apiFavoriteBook } from '~/composables/Api/Book/book'

    const props = defineProps({
        isfava:{
            type:Boolean,
            default:false
        },
        goods_id:{
            type:Number,
            default:0
        },
        type:{
            type:String,
            default:"course"
        }
    })

    const is_fava = ref(props.isfava)
    watch(() => props.isfava, (value) => {
        is_fava.value = Boolean(value)
    })

    const loading = ref(false)
    const handleFava = ()=>{
        // 登录之后才能收藏/取消收藏
        useHasAuth(async ()=>{
            loading.value = true

            const { message } = createDiscreteApi(["message"])
            const nextStatus = is_fava.value ? 0 : 1
            try {
                if (props.type === 'book') {
                    const response = await apiFavoriteBook(props.goods_id, nextStatus)
                    if (response?.code && response.code !== 200) {
                        throw new Error(response.msg || '收藏操作失败')
                    }
                } else {
                    const data = {
                        goods_id: props.goods_id,
                        type: props.type
                    }
                    const { error } = nextStatus === 0
                        ? await useUncollectApi(data)
                        : await useCollectApi(data)
                    if (error.value) return
                }
                is_fava.value = nextStatus === 1
                message.success(nextStatus === 1 ? '收藏成功' : '取消收藏成功')
            } catch (error) {
                message.error(error?.data?.msg || error?.message || '收藏操作失败')
            } finally {
                loading.value = false
            }
        })
    }
</script>

<style scoped>
/* No additional styles needed as there were no Tailwind classes to convert */
</style>
