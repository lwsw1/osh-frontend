<template>
  <div class="hot-wrap">
    <div class="hot-title">精品推荐</div>

    <n-carousel
        class="hot-carousel"
        show-arrow
        autoplay
        :interval="3000"
        dot-type="line"
        trigger="hover"
    >
      <div class="hot-slide">
        <div class="slide-tag">[技术]</div>
        <div class="slide-main">高并发接口限流方案</div>
        <div class="slide-desc">网关限流 + 令牌桶 + 熔断，适合秒杀流量场景。</div>
      </div>

      <div class="hot-slide">
        <div class="slide-tag">[架构]</div>
        <div class="slide-main">分布式事务解决方案</div>
        <div class="slide-desc">TCC、可靠消息最终一致性、补偿机制的实践总结。</div>
      </div>

      <div class="hot-slide">
        <div class="slide-tag">[性能]</div>
        <div class="slide-main">MySQL 千万级数据优化</div>
        <div class="slide-desc">索引设计、冷热分离、慢 SQL 排查与压测建议。</div>
      </div>
    </n-carousel>
  </div>
</template>

<script setup>
import { NCarousel } from "naive-ui";
</script>

<style scoped>
.hot-wrap {
  width: 100%;
}

.hot-title {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.hot-carousel {
  height: 280px;
}

.hot-slide {
  height: 280px;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.slide-tag {
  font-size: 13px;
  color: #0b7285;
  font-weight: 600;
  margin-bottom: 8px;
}

.slide-main {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  line-height: 1.5;
  margin-bottom: 10px;
}

.slide-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.7;
}
</style>
