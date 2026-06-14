<template>
  <section class="calculator-tool">
    <div class="panel-head">
      <div>
        <p class="kicker">Online Calculator</p>
        <h1>简易计算器</h1>
      </div>
      <span class="status-badge">站内工具</span>
    </div>

    <div class="calculator-grid">
      <label class="field-block">
        <span>第一个数字</span>
        <input v-model="leftValue" class="number-input" type="number" placeholder="请输入数字" />
      </label>

      <label class="field-block">
        <span>运算符</span>
        <select v-model="operator" class="select-input">
          <option value="+">加法 +</option>
          <option value="-">减法 -</option>
          <option value="*">乘法 *</option>
          <option value="/">除法 /</option>
        </select>
      </label>

      <label class="field-block">
        <span>第二个数字</span>
        <input v-model="rightValue" class="number-input" type="number" placeholder="请输入数字" />
      </label>
    </div>

    <div class="result-panel">
      <span>计算结果</span>
      <strong>{{ resultText }}</strong>
    </div>

    <p v-if="errorText" class="error-text">{{ errorText }}</p>

    <div class="action-row">
      <button class="primary-btn" type="button" :disabled="calculating" @click="calculate">
        {{ calculating ? '计算中...' : '计算' }}
      </button>
      <button class="ghost-btn" type="button" @click="resetCalculator">重置</button>
    </div>
  </section>
</template>

<script setup>
import { request } from '~/composables/useHttp'

const props = defineProps({
  toolId: {
    type: Number,
    required: true,
  },
});
const emit = defineEmits(['refresh-quota']);

const leftValue = ref('');
const rightValue = ref('');
const operator = ref('+');
const result = ref(null);
const errorText = ref('');
const calculating = ref(false);

const resultText = computed(() => {
  if (result.value === null) {
    return '--';
  }
  return Number.isInteger(result.value) ? String(result.value) : String(Number(result.value.toFixed(8)));
});

const calculate = () => {
  if (calculating.value) {
    return;
  }
  errorText.value = '';
  const left = Number(leftValue.value);
  const right = Number(rightValue.value);
  if (leftValue.value === '' || rightValue.value === '' || Number.isNaN(left) || Number.isNaN(right)) {
    result.value = null;
    errorText.value = '请输入两个有效数字';
    return;
  }
  if (operator.value === '/' && right === 0) {
    result.value = null;
    errorText.value = '除数不能为 0';
    return;
  }

  calculating.value = true;
  request('ToolCalculator', '/tool/calculator/calculate', {
    method: 'POST',
    body: {
      toolId: props.toolId,
      leftValue: left,
      rightValue: right,
      operator: operator.value,
    },
  }).then((res) => {
    if (res?.code === 200) {
      const nextResult = res?.data?.result;
      result.value = nextResult === null || nextResult === undefined ? null : Number(nextResult);
      emit('refresh-quota');
      return;
    }
    result.value = null;
    errorText.value = res?.msg === '工具使用次数不足' ? res.msg : '计算失败';
  }).catch((err) => {
    result.value = null;
    const errorMessage = err?.data?.msg || err?.message || '';
    errorText.value = errorMessage === '工具使用次数不足' ? errorMessage : '计算失败';
  }).finally(() => {
    calculating.value = false;
  });
};

const resetCalculator = () => {
  leftValue.value = '';
  rightValue.value = '';
  operator.value = '+';
  result.value = null;
  errorText.value = '';
  calculating.value = false;
};
</script>

<style scoped>
.calculator-tool {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
}
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.kicker {
  color: #26a67a;
  font-size: 12px;
  font-weight: 700;
  margin: 0 0 6px;
  text-transform: uppercase;
}
h1 {
  color: #1f2937;
  font-size: 24px;
  margin: 0;
}
.status-badge {
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  white-space: nowrap;
}
.calculator-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.field-block {
  display: grid;
  gap: 8px;
}
.field-block span {
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}
.number-input,
.select-input {
  width: 100%;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #1f2937;
  font-size: 14px;
  outline: none;
  padding: 0 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.number-input:focus,
.select-input:focus {
  border-color: #26a67a;
  box-shadow: 0 0 0 3px rgba(38, 166, 122, 0.14);
}
.result-panel {
  background: #f9fafb;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}
.result-panel span {
  color: #6b7280;
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
}
.result-panel strong {
  color: #111827;
  font-size: 28px;
  line-height: 1.2;
  word-break: break-all;
}
.error-text {
  color: #d03050;
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 12px;
}
.action-row {
  display: flex;
  gap: 10px;
}
.primary-btn,
.ghost-btn {
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  height: 36px;
  padding: 0 18px;
}
.primary-btn {
  background: #26a67a;
  border: 1px solid #26a67a;
  color: #fff;
}
.primary-btn:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}
.ghost-btn {
  background: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
}
@media (max-width: 720px) {
  .panel-head,
  .action-row {
    flex-direction: column;
  }
  .calculator-grid {
    grid-template-columns: 1fr;
  }
}
</style>
