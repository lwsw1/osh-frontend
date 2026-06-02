<template>
  <n-modal
    :show="show"
    :title="formData.id ? '编辑秒杀商品' : '新增秒杀商品'"
    preset="card"
    style="width: 560px; max-width: 96vw;"
    :mask-closable="false"
    @update:show="$emit('update:show', $event)"
  >
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="90px">

      <!-- 商品类型 -->
      <n-form-item label="商品类型" path="goodsType">
        <n-select
          v-model:value="formData.goodsType"
          :options="goodsTypeOptions"
          placeholder="请选择商品类型"
          @update:value="handleGoodsTypeChange"
        />
      </n-form-item>

      <!-- 商品ID -->
      <n-form-item label="商品ID" path="goodsId">
        <n-input-number
          v-model:value="formData.goodsId"
          :min="1"
          style="width: 100%"
          :placeholder="formData.goodsType === 2 ? '请输入电子书ID' : '请输入课程ID'"
          @blur="handleGoodsIdBlur"
        />
      </n-form-item>

      <!-- 预览区：商品ID失焦后自动回填，只读展示 -->
      <div v-if="preview.loading" class="preview-loading">查询中...</div>
      <div v-else-if="preview.goodsName" class="preview-card">
        <img v-if="preview.goodsCover" :src="preview.goodsCover" class="preview-cover" />
        <div class="preview-info">
          <div class="preview-name">{{ preview.goodsName }}</div>
          <div class="preview-price">原价：¥{{ preview.originPrice }}</div>
        </div>
      </div>

      <!-- 最低秒杀价 -->
      <n-form-item label="最低秒杀价" path="minSeckillPrice">
        <n-input-number
          v-model:value="formData.minSeckillPrice"
          :min="0.01" :precision="2"
          style="width: 100%"
          placeholder="必须大于0"
        >
          <template #prefix>¥</template>
        </n-input-number>
      </n-form-item>

      <!-- 排序 -->
      <n-form-item label="排序" path="sort">
        <n-input-number
          v-model:value="formData.sort"
          :min="0"
          style="width: 100%"
          placeholder="数字越大越靠前，默认0"
        />
      </n-form-item>

    </n-form>

    <template #footer>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleSubmit">
          {{ formData.id ? '保存修改' : '确认新增' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { NModal, NForm, NFormItem, NInputNumber, NSelect, NButton, createDiscreteApi } from 'naive-ui'

const props = defineProps({
  show: Boolean,
  initData: { type: Object, default: null },
})
const emit = defineEmits(['update:show', 'success'])

const { message } = createDiscreteApi(['message'])
const { seckillFetch } = useSeckillFetch()
const formRef = ref(null)
const loading = ref(false)

const goodsTypeOptions = [
  { label: '课程', value: 1 },
  { label: '电子书', value: 2 },
]

const defaultForm = () => ({
  id: null,
  goodsType: 1,
  goodsId: null,
  minSeckillPrice: null,
  sort: 0,
})

const formData = reactive(defaultForm())

const rules = {
  goodsType:      [{ required: true, type: 'number', message: '请选择商品类型', trigger: 'change' }],
  goodsId:        [{ required: true, type: 'number', message: '请填写商品ID', trigger: ['blur', 'change'] }],
  minSeckillPrice:[{ required: true, type: 'number', message: '请填写最低秒杀价', trigger: ['blur', 'change'] }],
}

// ── 商品预览 ──────────────────────────────────────────────────
const preview = reactive({ loading: false, goodsName: '', goodsCover: '', originPrice: null })

function clearPreview() {
  preview.goodsName = ''
  preview.goodsCover = ''
  preview.originPrice = null
}

function handleGoodsTypeChange() {
  formData.goodsId = null
  clearPreview()
}

async function handleGoodsIdBlur() {
  if (!formData.goodsId || !formData.goodsType) return
  preview.loading = true
  clearPreview()
  try {
    const res = await seckillFetch('/seckill/goods/preview', {
      method: 'GET',
      query: { goodsType: formData.goodsType, goodsId: formData.goodsId },
    })
    if (res?.code === 200 && res?.data) {
      preview.goodsName   = res.data.goodsName   || ''
      preview.goodsCover  = res.data.goodsCover  || ''
      preview.originPrice = res.data.originPrice ?? null
    } else {
      message.warning(res?.msg || '未找到该商品，请确认ID是否正确')
    }
  } catch {
    message.warning('查询商品信息失败，请确认ID是否正确')
  } finally {
    preview.loading = false
  }
}

// 弹窗打开时回填（编辑场景）
watch(() => props.show, (val) => {
  if (!val) return
  clearPreview()
  if (props.initData) {
    const d = props.initData
    Object.assign(formData, {
      ...defaultForm(),
      id:              d.id             ?? null,
      goodsType:       d.goodsType      ?? 1,
      goodsId:         d.goodsId        ?? null,
      minSeckillPrice: d.minSeckillPrice ?? null,
      sort:            d.sort           ?? 0,
    })
    preview.goodsName   = d.goodsName   || ''
    preview.goodsCover  = d.goodsCover  || ''
    preview.originPrice = d.originPrice ?? null
  } else {
    Object.assign(formData, defaultForm())
  }
})

async function handleSubmit() {
  try { await formRef.value?.validate() } catch { return }

  if (!formData.minSeckillPrice || formData.minSeckillPrice <= 0) {
    message.warning('最低秒杀价必须大于0')
    return
  }

  loading.value = true
  try {
    const url = formData.id ? '/seckill/goods/update' : '/seckill/goods/add'
    const body = {
      goodsType:       formData.goodsType,
      goodsId:         formData.goodsId,
      minSeckillPrice: formData.minSeckillPrice,
      sort:            formData.sort,
    }
    if (formData.id) body.id = formData.id

    const res = await seckillFetch(url, { method: 'POST', body })
    if (res?.code === 200) {
      message.success(formData.id ? '修改成功' : '新增成功')
      emit('update:show', false)
      emit('success')
    } else {
      message.error(res?.msg || (formData.id ? '修改失败' : '新增失败'))
    }
  } catch (e) {
    message.error(e?.data?.msg || (formData.id ? '修改失败' : '新增失败'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.preview-loading {
  font-size: 13px; color: #9ca3af;
  padding: 8px 0 12px; text-align: center;
}
.preview-card {
  display: flex; align-items: center; gap: 12px;
  background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 10px 14px;
  margin-bottom: 16px;
}
.preview-cover {
  width: 64px; height: 40px;
  object-fit: cover; border-radius: 4px;
  flex-shrink: 0; background: #e5e7eb;
}
.preview-info { min-width: 0; }
.preview-name {
  font-size: 13px; font-weight: 600; color: #111;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 4px;
}
.preview-price { font-size: 12px; color: #9ca3af; }
</style>
