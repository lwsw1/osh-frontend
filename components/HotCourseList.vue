<template>
    <section class="hot-course-section">
        <div class="hot-course-header">
            <h4>精品推荐</h4>
        </div>
        <div class="hot-course-list">
            <CourseList v-for="(item, index) in data" :key="index" :item="item" />
        </div>
    </section>
</template>

<script setup>
import { computed } from 'vue'

const { data: rawData } = await useHotCourseListApi()

const data = computed(() => {
    const list = Array.isArray(rawData.value) ? rawData.value : []
    return list.map((item) => ({
        ...item,
        type: 'course',
        t_price: item.t_price ?? item.tPrice,
    }))
})
</script>

<style>
/* 精品推荐整体容器 */
.hot-course-section {
    background-color: #ffffff; /* bg-white */
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); /* shadow 通用阴影值 */
    border-radius: 8px; /* rounded */
    margin-bottom: 20px; /* mb-5 (1rem=16px，5=20px) */
}

/* 标题栏 */
.hot-course-header {
    padding: 12px; /* p-3 (3=12px) */
    border-bottom: 1px solid #e5e7eb; /* border-b 通用边框色 */
}

/* 标题文字 */
.hot-course-header h4 {
    margin: 0; /* 清除h4默认外边距 */
    font-size: 16px; /* 适配常规h4字号，可根据需求调整 */
    font-weight: 600;
}

/* 课程列表容器 */
.hot-course-list {
    padding: 12px; /* p-3 */
}
</style>