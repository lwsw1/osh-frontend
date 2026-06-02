<template>
  <div class="home-page">

    <!-- 公告栏 -->
    <section class="notice-section">
      <div class="notice-bar">
        <div class="notice-label">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z" stroke="white" stroke-width="1.3" stroke-linejoin="round" fill="rgba(255,255,255,0.2)"/>
          </svg>
          <span>公告</span>
        </div>
        <div class="notice-scroll-wrap">
          <div
            class="notice-scroll-track"
            :style="{ animationPlayState: noticePaused ? 'paused' : 'running' }"
            @mouseenter="noticePaused = true"
            @mouseleave="noticePaused = false"
          >
            <span class="notice-item" v-for="(n, i) in [...notices, ...notices]" :key="i">
              <span class="notice-dot" :style="{ background: n.color }"></span>
              {{ n.text }}
              <span class="notice-sep">｜</span>
            </span>
          </div>
        </div>
      </div>
      <div class="notice-bar notice-bar-2">
        <div class="notice-label notice-label-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>动态</span>
        </div>
        <div class="notice-scroll-wrap">
          <div
            class="notice-scroll-track"
            :style="{ animationPlayState: noticePaused2 ? 'paused' : 'running' }"
            @mouseenter="noticePaused2 = true"
            @mouseleave="noticePaused2 = false"
          >
            <span class="notice-item" v-for="(n, i) in [...notices2, ...notices2]" :key="'n2-'+i">
              <span class="notice-dot" :style="{ background: n.color }"></span>
              {{ n.text }}
              <span class="notice-sep">｜</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Hero Banner - 2x2 Grid Carousel -->
    <section class="hero-section" @mouseenter="pauseCarousel" @mouseleave="resumeCarousel">

      <!-- 管理员编辑入口按钮 -->
      <button v-if="isAdmin" class="carousel-edit-btn" @click="openBannerEditor">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        编辑轮播图
      </button>

      <!-- 轮播内容 -->
      <div class="hero-content">
        <!-- 左箭头 -->
        <button class="carousel-arrow carousel-arrow-left" @click="prevSlide">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 5l-4 4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- 2x2 网格卡片 -->
        <transition name="carousel-fade" mode="out-in">
          <div class="carousel-grid" :key="carouselPageIndex">
            <div
              v-for="(item, idx) in currentPageItems"
              :key="idx"
              class="carousel-grid-card"
              :style="{ background: item.cardBg }"
              @click="navigateTo(item.path)"
            >
              <!-- 卡片装饰 -->
              <div class="grid-card-deco"></div>
              <!-- 左侧内容 -->
              <div class="grid-card-left">
                <div class="grid-card-icon" :style="{ background: item.iconBg }">
                  <span class="grid-card-emoji">{{ item.emoji }}</span>
                </div>
                <h3 class="grid-card-title">{{ item.title }}</h3>
                <p class="grid-card-sub">{{ item.subtitle }}</p>
                <button class="grid-card-btn" @click.stop="navigateTo(item.path)">
                  {{ item.btnText }}
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <!-- 右侧标签 -->
              <div class="grid-card-right" v-if="item.tags">
                <div
                  v-for="(tag, ti) in item.tags"
                  :key="ti"
                  class="grid-card-tag"
                >
                  <span class="grid-tag-icon">{{ tag.icon }}</span>
                  <span class="grid-tag-text">{{ tag.text }}</span>
                </div>
              </div>
            </div>
            <!-- 占位卡片：不足4个时填满网格 -->
            <div
              v-for="n in (4 - currentPageItems.length)"
              :key="'placeholder-' + n"
              class="carousel-grid-card carousel-grid-card-placeholder"
              :style="{ background: 'transparent' }"
            ></div>
          </div>
        </transition>

        <!-- 右箭头 -->
        <button class="carousel-arrow carousel-arrow-right" @click="nextSlide">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 5l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- 指示点 -->
        <div class="hero-footer">
          <div class="carousel-dots">
            <button
              v-for="(_, i) in totalPages"
              :key="i"
              class="carousel-dot"
              :class="{ active: i === carouselPageIndex }"
              @click="goToSlide(i)"
            />
          </div>
        </div>
      </div>

      <!-- 轮播图编辑弹窗 -->
      <div v-if="showBannerEditor" class="banner-editor-overlay" @click.self="closeBannerEditor">
        <div class="banner-editor-modal">
          <div class="banner-editor-header">
            <h3>编辑轮播图</h3>
            <span class="banner-editor-count">共 {{ editingCarouselItems.length }} 项</span>
            <button class="banner-editor-close" @click="closeBannerEditor">✕</button>
          </div>
          <div class="banner-editor-body">
            <div class="banner-editor-list">
              <div
                v-for="(item, idx) in editingCarouselItems"
                :key="idx"
                class="banner-editor-item"
                :class="{ 'banner-editor-item-hidden': item.isVisible === false }"
              >
                <div class="banner-editor-item-num">{{ idx + 1 }}</div>
                <div class="banner-editor-item-preview" :style="{ background: item.cardBg }">
                  <span class="banner-editor-item-emoji">{{ item.emoji }}</span>
                </div>
                <!-- 显示/隐藏状态标记 -->
                <div
                  class="banner-editor-visible-tag"
                  :class="item.isVisible !== false ? 'visible-tag-on' : 'visible-tag-off'"
                  @click="toggleVisibility(idx)"
                >
                  {{ item.isVisible !== false ? '显示' : '隐藏' }}
                </div>
                <!-- 可点击的编辑入口区域 -->
                <div class="banner-editor-item-entry" @click="openCardDetail(idx)">
                  <div class="banner-editor-entry-title">{{ item.title || '未设置标题' }}</div>
                  <div class="banner-editor-entry-sub">{{ item.subtitle || '点击编辑详情' }}</div>
                  <div class="banner-editor-entry-meta">
                    <span class="banner-editor-entry-path">{{ item.path }}</span>
                    <span class="banner-editor-entry-hint">点击编辑 →</span>
                  </div>
                </div>
                <div class="banner-editor-item-actions">
                  <button class="banner-editor-action-btn" @click="moveBannerItem(idx, -1)" :disabled="idx === 0">↑</button>
                  <button class="banner-editor-action-btn" @click="moveBannerItem(idx, 1)" :disabled="idx === editingCarouselItems.length - 1">↓</button>
                  <button class="banner-editor-action-btn banner-editor-delete" @click="removeBannerItem(idx)">×</button>
                </div>
              </div>
            </div>
            <button class="banner-editor-add" @click="addBannerItem">+ 添加轮播项</button>
          </div>
          <div class="banner-editor-footer">
            <button class="banner-editor-cancel" @click="closeBannerEditor">取消</button>
            <button class="banner-editor-save" @click="saveBannerItems">保存全部</button>
          </div>
        </div>
      </div>

      <!-- 单个卡片详细编辑弹窗 -->
      <div v-if="showCardDetail" class="banner-editor-overlay" @click.self="showCardDetail = false">
        <div class="card-detail-modal">
          <div class="card-detail-header">
            <h3>编辑卡片 #{{ editingCardIndex + 1 }}</h3>
            <button class="banner-editor-close" @click="showCardDetail = false">✕</button>
          </div>
          <div class="card-detail-body" v-if="editingCard">
            <div class="card-detail-preview" :style="{ background: editingCard.cardBg }">
              <div class="card-detail-preview-icon" :style="{ background: editingCard.iconBg }">
                <span>{{ editingCard.emoji }}</span>
              </div>
              <div class="card-detail-preview-text">
                <div class="card-detail-preview-title">{{ editingCard.title || '标题' }}</div>
                <div class="card-detail-preview-sub">{{ editingCard.subtitle || '副标题' }}</div>
              </div>
            </div>
            <div class="card-detail-form">
              <div class="card-detail-field">
                <label>标题</label>
                <input v-model="editingCard.title" class="card-detail-input" placeholder="卡片标题" />
              </div>
              <div class="card-detail-field">
                <label>副标题</label>
                <input v-model="editingCard.subtitle" class="card-detail-input" placeholder="副标题描述" />
              </div>
              <div class="card-detail-row">
                <div class="card-detail-field">
                  <label>图标 Emoji</label>
                  <div class="card-detail-picker">
                    <div class="picker-selected">
                      <input v-model="editingCard.emoji" class="card-detail-input" placeholder="⚡" maxlength="2" />
                    </div>
                    <div class="picker-options emoji-options">
                      <span
                        v-for="e in emojiPresets"
                        :key="e"
                        class="picker-option-item emoji-item"
                        :class="{ active: editingCard.emoji === e }"
                        @click="editingCard.emoji = e"
                      >{{ e }}</span>
                    </div>
                  </div>
                </div>
                <div class="card-detail-field">
                  <label>按钮文字</label>
                  <input v-model="editingCard.btnText" class="card-detail-input" placeholder="立即抢购" />
                </div>
              </div>
              <div class="card-detail-field">
                <label>跳转路径</label>
                <input v-model="editingCard.path" class="card-detail-input" placeholder="/list/flashsale/1" />
              </div>
              <div class="card-detail-field">
                <label>图标背景色</label>
                <div class="picker-options gradient-options">
                  <div
                    v-for="(g, gi) in iconBgPresets"
                    :key="gi"
                    class="picker-option-item gradient-item"
                    :class="{ active: editingCard.iconBg === g.value }"
                    :style="{ background: g.value }"
                    @click="editingCard.iconBg = g.value"
                  >
                    <span class="gradient-label">{{ g.name }}</span>
                  </div>
                </div>
                <input v-model="editingCard.iconBg" class="card-detail-input" placeholder="linear-gradient(135deg, #ef4444, #f97316)" style="margin-top:8px" />
              </div>
              <div class="card-detail-field">
                <label>卡片背景色</label>
                <div class="picker-options gradient-options">
                  <div
                    v-for="(g, gi) in cardBgPresets"
                    :key="gi"
                    class="picker-option-item gradient-item"
                    :class="{ active: editingCard.cardBg === g.value }"
                    :style="{ background: g.value }"
                    @click="editingCard.cardBg = g.value"
                  >
                    <span class="gradient-label">{{ g.name }}</span>
                  </div>
                </div>
                <input v-model="editingCard.cardBg" class="card-detail-input" placeholder="linear-gradient(135deg, #1e1b4b, #4c1d95)" style="margin-top:8px" />
              </div>
              <div class="card-detail-row">
                <div class="card-detail-field">
                  <label>功能标签1</label>
                  <div class="feature-input-row">
                    <input v-model="editingCard.feature1Icon" class="card-detail-input feature-icon-input" placeholder="📋" maxlength="2" />
                    <input v-model="editingCard.feature1" class="card-detail-input" placeholder="限时特惠" />
                  </div>
                  <div class="picker-options emoji-options feature-emoji-picker">
                    <span v-for="e in featureIconPresets" :key="'f1'+e" class="picker-option-item emoji-item emoji-item-sm" :class="{ active: editingCard.feature1Icon === e }" @click="editingCard.feature1Icon = e">{{ e }}</span>
                  </div>
                </div>
                <div class="card-detail-field">
                  <label>功能标签2</label>
                  <div class="feature-input-row">
                    <input v-model="editingCard.feature2Icon" class="card-detail-input feature-icon-input" placeholder="🎯" maxlength="2" />
                    <input v-model="editingCard.feature2" class="card-detail-input" placeholder="低至1折" />
                  </div>
                  <div class="picker-options emoji-options feature-emoji-picker">
                    <span v-for="e in featureIconPresets" :key="'f2'+e" class="picker-option-item emoji-item emoji-item-sm" :class="{ active: editingCard.feature2Icon === e }" @click="editingCard.feature2Icon = e">{{ e }}</span>
                  </div>
                </div>
                <div class="card-detail-field">
                  <label>功能标签3</label>
                  <div class="feature-input-row">
                    <input v-model="editingCard.feature3Icon" class="card-detail-input feature-icon-input" placeholder="📊" maxlength="2" />
                    <input v-model="editingCard.feature3" class="card-detail-input" placeholder="每日更新" />
                  </div>
                  <div class="picker-options emoji-options feature-emoji-picker">
                    <span v-for="e in featureIconPresets" :key="'f3'+e" class="picker-option-item emoji-item emoji-item-sm" :class="{ active: editingCard.feature3Icon === e }" @click="editingCard.feature3Icon = e">{{ e }}</span>
                  </div>
                </div>
              </div>
              <div class="card-detail-row">
                <div class="card-detail-field">
                  <label>排序</label>
                  <input v-model.number="editingCard.sort" class="card-detail-input" type="number" min="1" :max="visibleCarouselItems.length || 1" placeholder="1" />
                </div>
                <div class="card-detail-field">
                  <label>是否显示</label>
                  <button
                    class="card-detail-visibility-btn"
                    :class="editingCard.isVisible !== false ? 'visibility-btn-on' : 'visibility-btn-off'"
                    @click="toggleCardDetailVisibility"
                  >
                    <span class="visibility-btn-icon">{{ editingCard.isVisible !== false ? '👁️' : '🚫' }}</span>
                    <span class="visibility-btn-text">{{ editingCard.isVisible !== false ? '当前：显示中' : '当前：已隐藏' }}</span>
                    <span class="visibility-btn-hint">点击切换</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="card-detail-footer">
            <button class="banner-editor-cancel" @click="showCardDetail = false">关闭</button>
            <button class="banner-editor-save" @click="saveCardDetail">确认</button>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showDeleteConfirm" class="banner-editor-overlay" @click.self="cancelDelete">
        <div class="delete-confirm-modal">
          <div class="delete-confirm-icon">⚠️</div>
          <h3 class="delete-confirm-title">确认删除</h3>
          <p class="delete-confirm-text">确定要删除「{{ confirmDeleteTitle }}」吗？</p>
          <p class="delete-confirm-sub">删除后需点击"保存全部"才会生效</p>
          <div class="delete-confirm-actions">
            <button class="banner-editor-cancel" @click="cancelDelete">取消</button>
            <button class="delete-confirm-btn" @click="confirmDelete">确定删除</button>
          </div>
        </div>
      </div>

      <!-- 显示/隐藏切换确认弹窗 -->
      <div v-if="showVisibilityConfirm" class="banner-editor-overlay" @click.self="showVisibilityConfirm = false">
        <div class="delete-confirm-modal">
          <div class="delete-confirm-icon">👁️</div>
          <h3 class="delete-confirm-title">确认{{ visibilityTargetVisible ? '显示' : '隐藏' }}</h3>
          <p class="delete-confirm-text">确定将「{{ visibilityTargetTitle }}」改为{{ visibilityTargetVisible ? '显示' : '未显示' }}？</p>
          <p class="delete-confirm-sub" v-if="!visibilityTargetVisible">隐藏后该卡片不会在首页轮播图中展示</p>
          <div class="delete-confirm-actions">
            <button class="banner-editor-cancel" @click="showVisibilityConfirm = false">取消</button>
            <button class="banner-editor-save" @click="confirmToggleVisibility">确定</button>
          </div>
        </div>
      </div>

      <!-- 保存确认弹窗 -->
      <div v-if="showSaveConfirm" class="banner-editor-overlay" @click.self="showSaveConfirm = false">
        <div class="delete-confirm-modal" style="width:420px">
          <div class="delete-confirm-icon">💾</div>
          <h3 class="delete-confirm-title">确认保存</h3>
          <div class="save-confirm-changes">
            <div v-if="saveChanges.added.length" class="save-change-item save-change-add">
              <span class="save-change-label">新增</span>
              <span>{{ saveChanges.added.join('、') }}</span>
            </div>
            <div v-if="saveChanges.removed.length" class="save-change-item save-change-remove">
              <span class="save-change-label">删除</span>
              <span>{{ saveChanges.removed.join('、') }}</span>
            </div>
            <div v-if="saveChanges.edited && saveChanges.edited.length" class="save-change-item save-change-edit">
              <span class="save-change-label">编辑卡片</span>
              <span>{{ saveChanges.edited.join('、') }}</span>
            </div>
            <div v-if="saveChanges.visibilityChanged && saveChanges.visibilityChanged.length" class="save-change-item save-change-visibility">
              <span class="save-change-label">显隐</span>
              <span>{{ saveChanges.visibilityChanged.join('、') }}</span>
            </div>
            <div v-if="saveChanges.reordered" class="save-change-item save-change-edit">
              <span class="save-change-label">排序</span>
              <span>卡片顺序已调整</span>
            </div>
            <div v-if="!saveChanges.added.length && !saveChanges.removed.length && (!saveChanges.edited || !saveChanges.edited.length) && (!saveChanges.visibilityChanged || !saveChanges.visibilityChanged.length) && !saveChanges.reordered" class="save-change-item save-change-none">
              <span>✅ 没有检测到变更</span>
            </div>
          </div>
          <p class="delete-confirm-sub">确定保存以上变更到首页轮播图吗？</p>
          <div class="delete-confirm-actions">
            <button class="banner-editor-cancel" @click="showSaveConfirm = false">取消</button>
            <button class="banner-editor-save" @click="confirmSave">确定保存</button>
          </div>
        </div>
      </div>

    </section>



    <!-- 课程套餐对比 -->
    <section class="pricing-section">
      <div class="section-container">
        <div class="features-header">
          <h2 class="section-title" style="color:#1e1b4b">选择适合你的套餐</h2>
          <p class="section-subtitle">不同档次满足不同学习需求，随时升级，终身受益</p>
        </div>

        <div class="pricing-horizontal">

          <!-- 觉哥就业小班（上面） -->
          <div class="pricing-h-card pricing-h-class">
            <div class="ph-top-row">
              <div class="ph-left">
                <div class="ph-badge">⭐ 强烈推荐</div>
                <h3 class="ph-title">觉哥就业小班</h3>
                <p class="ph-sub">就业培训 · 面试指导 · 专人专属规划</p>
                <div class="ph-price">
                  <span class="ph-price-num">¥2199</span>
                  <span class="ph-price-unit">起 / 永久</span>
                </div>
              </div>
              <div class="ph-middle">
                <div class="ph-highlights">
                  <div class="ph-expand-step" v-for="(step, i) in classTechPath" :key="'t'+i">
                    <span class="ph-expand-step-num">{{ i + 1 }}</span>
                    <span class="ph-expand-step-title">{{ step.title }}</span>
                    <span class="ph-expand-step-desc">{{ step.desc }}</span>
                  </div>
                </div>
              </div>
              <div class="ph-right">
                <ul class="ph-feat-list">
                  <li v-for="(f, i) in classFeatures" :key="i">
                    <span class="ph-check">✓</span>{{ f }}
                  </li>
                </ul>
                <button class="ph-btn ph-btn-class" @click="navigateTo('/course/1')">立即报名小班 →</button>
              </div>
            </div>
            <!-- 右上角可展开按钮 -->
            <button class="ph-expand-btn" @click="classExpanded = !classExpanded">
              {{ classExpanded ? '收起' : '了解更多' }}
              <svg :class="{ 'ph-expand-icon-open': classExpanded }" class="ph-expand-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <!-- 展开内容 -->
            <div v-if="classExpanded" class="ph-expand-panel">
              <div class="ph-expand-grid">
                <div class="ph-expand-block">
                  <h4 class="ph-expand-block-title">👥 学员情况</h4>
                  <div class="ph-expand-item" v-for="(s, i) in classStudents" :key="'s'+i">
                    <span class="ph-expand-dot"></span>
                    <span>{{ s }}</span>
                  </div>
                </div>
                <div class="ph-expand-block">
                  <h4 class="ph-expand-block-title">🎯 服务亮点</h4>
                  <div class="ph-hl" v-for="(h, i) in classHighlights" :key="'h'+i">
                    <span class="ph-hl-icon">{{ h.icon }}</span>
                    <div>
                      <div class="ph-hl-title">{{ h.title }}</div>
                      <div class="ph-hl-desc">{{ h.desc }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- VIP 会员（下面） -->
          <div class="pricing-h-card pricing-h-vip">
            <div class="ph-left">
              <div class="ph-icon-vip">👑</div>
              <h3 class="ph-title">VIP 会员</h3>
              <p class="ph-sub">全站畅学，尊享特权</p>
              <div class="ph-price">
                <span class="ph-price-num">¥188</span>
                <span class="ph-price-unit">/ 年</span>
              </div>
            </div>
            <div class="ph-middle ph-middle-vip">
              <div class="ph-vip-intro">
                <p class="ph-vip-slogan">🚀 一次开通，全年畅学无忧</p>
                <p class="ph-vip-desc">解锁全站 1000+ 付费课程、VIP 专属直播课、专属题库全解锁、优先答疑通道、学习进度云同步，随时随地高效学习。</p>
                <p class="ph-vip-tip">💡 支持随时升级觉哥就业小班</p>
              </div>
            </div>
            <div class="ph-right">
              <ul class="ph-feat-list">
                <li v-for="(feat, j) in vipFeatures" :key="'r'+j">
                  <span class="ph-check">✓</span>{{ feat }}
                </li>
              </ul>
              <button class="ph-btn ph-btn-vip" @click="navigateTo('/course/1')">立即开通 VIP</button>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 热门课程 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag">HOT</div>
            <h2 class="section-title">热门课程</h2>
            <p class="section-subtitle">精选高质量课程，助你快速提升技能</p>
          </div>
          <button class="btn-more" @click="navigateTo(hotCourseListUrl || getNavPath('course', '/course/1'))">
            查看全部
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="course-grid">
          <div
            v-for="(course, index) in hotCourses"
            :key="index"
            class="course-card"
            @click="navigateTo(course.detailUrl)"
          >
            <div class="course-cover" :style="course.coverStyle">
              <!-- 封面背景装饰 -->
              <div class="cover-deco-circle cover-deco-1"></div>
              <div class="cover-deco-circle cover-deco-2"></div>
              <!-- 课程标题 -->
              <div class="cover-title-block">
                <div class="cover-main-title">{{ course.coverTitle }}</div>
                <div class="cover-sub-title">{{ course.coverSub }}</div>
              </div>
              <!-- 购买人数 -->
              <div class="cover-heat">🔥 {{ course.buyCountText }}人购买</div>
            </div>
            <div class="course-body">
              <h3 class="course-title">{{ course.title }}</h3>
              <p class="course-desc">{{ course.serviceContent }}</p>
              <div class="course-tags-row">
                <div class="course-tags">
                  <span class="course-tag" v-for="tag in course.tags" :key="tag">{{ tag }}</span>
                </div>
                <span class="course-views-text">👁 {{ course.viewsText }}浏览</span>
              </div>
              <div class="course-footer">
                <span class="price-current" v-if="course.price > 0">¥{{ course.price }}</span>
                <span class="price-free" v-else>免费</span>
                <span class="price-origin" v-if="course.originPrice">¥{{ course.originPrice }}</span>
                <span class="course-footer-right">
                  <span class="course-video-inline">🎬 {{ course.videoCount || 0 }}个视频</span>
                  <span class="course-rating-star">
                    <svg width="14" height="14" viewBox="0 0 13 13" fill="#f59e0b">
                      <path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2h4L6.5 1z"/>
                    </svg>
                    {{ course.rating }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 活动专区 - 已移除，内容整合到各独立模块 -->

    <!-- 电子书推荐 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">📚</div>
            <h2 class="section-title">精选电子书</h2>
            <p class="section-subtitle">涵盖前端、后端、AI 等热门方向</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('book', '/list/book/1'))">查看全部 →</button>
        </div>
        <div class="course-grid">
          <div
            v-for="(book, index) in hotBooks"
            :key="index"
            class="course-card"
            @click="navigateTo(book.detailUrl)"
          >
            <div class="course-cover" :style="book.coverStyle">
              <div class="cover-deco-circle cover-deco-1"></div>
              <div class="cover-deco-circle cover-deco-2"></div>
              <div class="cover-title-block">
                <div class="cover-main-title">{{ book.coverTitle }}</div>
                <div class="cover-sub-title">{{ book.coverSub }}</div>
              </div>
              <div class="cover-heat">📖 {{ book.subCountText }}人订阅</div>
            </div>
            <div class="course-body">
              <h3 class="course-title">{{ book.title }}</h3>
              <p class="course-desc">{{ book.description }}</p>
              <div class="course-tags-row">
                <div class="course-tags">
                  <span class="course-tag" v-for="tag in book.tags" :key="tag">{{ tag }}</span>
                </div>
                <span class="course-views-text">📚 {{ book.chapterCount || 0 }}章</span>
              </div>
              <div class="course-footer">
                <span class="price-current" v-if="book.price > 0">¥{{ book.price }}</span>
                <span class="price-free" v-else>免费</span>
                <span class="course-footer-right">
                  <span class="course-video-inline">Lv.{{ book.level || 1 }}</span>
                  <span class="course-rating-star">
                    <svg width="15" height="15" viewBox="0 0 13 13" fill="#8b5cf6">
                      <path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2h4L6.5 1z"/>
                    </svg>
                    {{ book.hotScore ? book.hotScore.toFixed(1) : '0.0' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 在线考试 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#10b981,#059669)">📝</div>
            <h2 class="section-title">在线考试</h2>
            <p class="section-subtitle">海量真题模拟，助你轻松通关</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('exam', '/paper/1'))">查看全部 →</button>
        </div>
        <div class="course-grid">
          <div
            v-for="(exam, index) in hotExams"
            :key="index"
            class="course-card"
            @click="navigateTo(exam.detailUrl)"
          >
            <div class="course-cover" :style="exam.coverStyle">
              <div class="cover-deco-circle cover-deco-1"></div>
              <div class="cover-deco-circle cover-deco-2"></div>
              <div class="cover-title-block">
                <div class="cover-main-title">{{ exam.coverTitle }}</div>
                <div class="cover-sub-title">{{ exam.coverSub }}</div>
              </div>
              <div class="cover-heat">📝 {{ exam.questionCount }}题</div>
            </div>
            <div class="course-body">
              <h3 class="course-title">{{ exam.title }}</h3>
              <p class="course-desc">{{ exam.description }}</p>
              <div class="course-tags-row">
                <div class="course-tags">
                  <span class="course-tag" v-for="tag in exam.tags" :key="tag">{{ tag }}</span>
                </div>
                <span class="course-views-text">⏱ {{ exam.expire }}分钟</span>
              </div>
              <div class="course-footer">
                <span class="price-current" style="font-size:14px;color:#6366f1">及格 {{ exam.passScore }}分</span>
                <span class="course-footer-right">
                  <span class="course-video-inline">⭐ {{ exam.collectCountText }}收藏</span>
                  <span class="course-rating-star">
                    <svg width="15" height="15" viewBox="0 0 13 13" fill="#f59e0b">
                      <path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2h4L6.5 1z"/>
                    </svg>
                    {{ exam.hotScore ? exam.hotScore.toFixed(1) : '0.0' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 答疑社区 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#f59e0b,#f97316)">💬</div>
            <h2 class="section-title">答疑社区</h2>
            <p class="section-subtitle">专家在线解答，学习不再孤单</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('qa', '/question_answer/1'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-3">
          <div v-for="(item, i) in (hotQa.length ? hotQa : mockQnA)" :key="i" class="qna-card" :class="{ 'qna-answered': item.status === 1, 'qna-pending': item.status !== 1 }" :style="{ background: item.bg }" @click="navigateTo(item.detailUrl || '/question_answer/1')">
            <div class="qna-card-top">
              <h4 class="qna-card-title">{{ item.title }}</h4>
              <span class="qna-card-views">👁 {{ item.viewCount }}</span>
            </div>
            <div class="qna-card-meta">
              <span class="qna-meta-user"><span>👤</span> {{ item.user }}</span>
              <span class="qna-meta-time"><span>🕐</span> {{ item.time }}</span>
            </div>
            <p class="qna-card-desc">{{ item.content }}</p>
            <div v-if="item.tags && item.tags.length" class="qna-card-tags">
              <span class="qna-meta-tag" v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="qna-card-bottom">
              <span class="qna-bottom-stat">💬 {{ item.replyCount }} 回答</span>
              <span class="qna-bottom-stat">⭐ {{ item.followCount }} 关注</span>
              <span class="qna-status-badge" :class="item.status === 2 ? 'qna-status-solved' : 'qna-status-open'">
                {{ item.status === 2 ? '✅ 已解决' : '🔓 待解答' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 秒杀专区 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#ef4444,#f97316)">⚡</div>
            <h2 class="section-title">限时秒杀</h2>
            <p class="section-subtitle">每日精选课程，低至1折</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('seckill', '/list/flashsale/1'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotSeckill.length ? hotSeckill : mockFlashsale)" :key="i" class="seckill-card" @click="navigateTo(item.detailUrl || '/seckill')">
            <div class="seckill-card-cover" :style="{ background: item.bg }">
              <span class="seckill-limit">🔥 限量{{ item.limit }}名</span>
            </div>
            <div class="seckill-card-body">
              <h4 class="seckill-card-title">{{ item.title }}</h4>
              <div class="seckill-card-price">
                <span class="seckill-flash">秒杀价 ¥{{ item.salePrice }}</span>
                <span class="seckill-origin">¥{{ item.originPrice }}</span>
                <span class="seckill-type">{{ item.type }}</span>
                <span class="seckill-buy-limit">限购 2件</span>
              </div>
              <div class="seckill-progress">
                <div class="seckill-progress-bar">
                  <div class="seckill-progress-fill" :style="{ width: item.bought + '%' }"></div>
                </div>
                <span class="seckill-progress-text">已抢 {{ item.bought }}%</span>
              </div>
              <button class="seckill-btn" @click.stop="navigateTo(item.detailUrl || '/seckill')">立即抢购</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 拼团专区 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">👥</div>
            <h2 class="section-title">拼团优惠</h2>
            <p class="section-subtitle">邀请好友一起学，享受更低价格</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('group', '/list/group/1'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotGroup.length ? hotGroup : mockGroup)" :key="i" class="group-card" @click="navigateTo(item.detailUrl || '/list/group/1')">
            <!-- 顶部：标题 + 人数徽章 -->
            <div class="group-card-header">
              <h4 class="group-card-title">{{ item.title }}</h4>
              <span class="group-card-badge">{{ item.groupCount }}人团</span>
            </div>
            <!-- 价格区 -->
            <div class="group-card-price-row">
              <span class="group-card-label">现价</span>
              <span class="group-card-price">¥{{ item.groupPrice }}</span>
            </div>
            <div class="group-card-origin-row">
              <span class="group-card-label">原价</span>
              <span class="group-card-origin">¥{{ item.originPrice }}</span>
            </div>
            <!-- 人数上限 -->
            <div class="group-card-info-row" v-if="item.maxNum">
              <span class="group-card-info-label">人数上限</span>
              <span class="group-card-info-val">{{ item.maxNum }}人</span>
            </div>
            <!-- 时间信息 -->
            <div class="group-card-time-block" v-if="item.startTime || item.endTime">
              <div class="group-card-time-row" v-if="item.startTime">
                <span class="group-card-time-label">开始时间</span>
                <span class="group-card-time-val">{{ item.startTime }}</span>
              </div>
              <div class="group-card-time-row" v-if="item.endTime">
                <span class="group-card-time-label">截止时间</span>
                <span class="group-card-time-val">{{ item.endTime }}</span>
              </div>
            </div>
            <!-- 进度条 -->
            <div class="group-card-progress-wrap">
              <div class="group-card-progress-bar">
                <div class="group-card-progress-fill" :style="{ width: Math.min(100, Math.round((item.currentNum || 0) / (item.groupCount || 1) * 100)) + '%' }"></div>
              </div>
              <span class="group-card-progress-text">{{ item.currentNum || 0 }}/{{ item.groupCount }}</span>
            </div>
            <!-- 按钮 -->
            <button class="group-card-btn" @click.stop="navigateTo(item.detailUrl || '/list/group/1')">立即参团</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 开源项目 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#14b8a6,#06b6d4)">🚀</div>
            <h2 class="section-title">开源项目</h2>
            <p class="section-subtitle">真实项目案例，边学边练提升实战能力</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('openproject', '/openproject/list'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotOpenProject.length ? hotOpenProject : mockOpenProjects)" :key="i" class="openproj-card" @click="navigateTo(item.detailUrl || '/openproject/list')">
            <div class="openproj-card-cover" :style="{ background: item.bg }">
              <span class="openproj-status-badge">活跃维护</span>
              <span class="openproj-star-badge">⭐ {{ item.stars }}</span>
            </div>
            <div class="openproj-card-body">
              <h4 class="openproj-card-title">{{ item.siteName }}</h4>
              <div class="openproj-card-tags">
                <span class="openproj-tag" v-for="tag in item.tagList" :key="tag">{{ tag }}</span>
              </div>
              <p class="openproj-card-desc">{{ item.description }}</p>
              <div class="openproj-card-meta">
                <span class="openproj-author">👤 {{ item.author }}</span>
                <span class="openproj-stat">⭐ {{ item.stars }}</span>
                <span class="openproj-stat">🍴 {{ item.forkCount }}</span>
              </div>
              <div class="openproj-card-footer">
                <span class="openproj-date">{{ item.lastCommit }}</span>
                <a class="openproj-link" @click.stop>访问 GitHub →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 实用网站 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">🌐</div>
            <h2 class="section-title">实用网站</h2>
            <p class="section-subtitle">程序员常用工具站点，一站式收藏</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('usefull', '/usefull/list'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotWebsite.length ? hotWebsite : mockWebsites)" :key="i" class="website-card" @click="navigateTo(item.detailUrl || '/usefull/list')">
            <div class="website-card-cover" :style="{ background: item.bg }">
              <span class="website-card-emoji">{{ item.emoji }}</span>
              <span class="website-good-badge">👍 {{ item.goodCount }}</span>
            </div>
            <div class="website-card-body">
              <h4 class="website-card-title">{{ item.name }}</h4>
              <p class="website-card-desc">{{ item.description }}</p>
              <div class="website-card-stats">
                <span class="website-stat">👁 {{ (item.clickCount / 1000).toFixed(1) }}K</span>
                <span class="website-stat">⭐ {{ item.collectionCount }}</span>
              </div>
              <div class="website-card-footer">
                <a class="website-visit-link" @click.stop>点击访问 →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 信息差 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#ec4899,#f43f5e)">💡</div>
            <h2 class="section-title">技术信息差</h2>
            <p class="section-subtitle">精选行业资源，发现趋势机会</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('info_gap', '/info_gap/1'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotInfoGap.length ? hotInfoGap : mockInfoGap)" :key="i" class="infogap-card" @click="navigateTo(item.detailUrl || '/info_gap/1')">
            <div class="infogap-card-cover" :style="{ background: item.bg }">
              <span class="infogap-tag-badge">{{ item.tag }}</span>
            </div>
            <div class="infogap-card-body">
              <h4 class="infogap-card-title">{{ item.title }}</h4>
              <p class="infogap-card-desc">{{ item.content }}</p>
              <div class="infogap-card-tags" v-if="item.tags">
                <span class="infogap-tag-item" v-for="t in item.tags" :key="t">{{ t }}</span>
              </div>
              <div class="infogap-card-footer">
                <span class="infogap-author">👤 {{ item.author }}</span>
                <span class="infogap-stat good">👍 {{ item.goodCount }}</span>
                <span class="infogap-stat mid">😐 {{ item.middleCount }}</span>
                <span class="infogap-stat bad">👎 {{ item.badCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 实用工具 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#f97316,#f59e0b)">🔧</div>
            <h2 class="section-title">实用工具</h2>
            <p class="section-subtitle">AI工具、开发辅助，提升效率</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('tool', '/tool/1'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotTool.length ? hotTool : mockTools)" :key="i" class="tool-card" @click="navigateTo(item.detailUrl || '/tool/1')">
            <div class="tool-card-cover" :style="{ background: item.bg }">
              <span class="tool-card-type">{{ item.resourceType }}</span>
            </div>
            <div class="tool-card-body">
              <h4 class="tool-card-title">{{ item.toolName }}</h4>
              <p class="tool-card-desc">{{ item.description }}</p>
              <div class="tool-card-tags" v-if="item.tags">
                <span class="tool-tag-item" v-for="t in item.tags" :key="t">{{ t }}</span>
              </div>
              <div class="tool-card-footer">
                <span class="tool-card-usage">🔥 {{ item.usageCount }}次使用</span>
                <span class="tool-card-price">{{ item.price > 0 ? '¥' + item.price : '免费' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 用户反馈 -->
    <section class="content-section">
      <div class="section-container">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-tag" style="background:linear-gradient(135deg,#10b981,#14b8a6)">📋</div>
            <h2 class="section-title">用户反馈</h2>
            <p class="section-subtitle">倾听用户声音，持续改进产品</p>
          </div>
          <button class="btn-more" @click="navigateTo(getNavPath('feedback', '/feedback/list'))">查看全部 →</button>
        </div>
        <div class="module-grid module-grid-5">
          <div v-for="(item, i) in (hotFeedback.length ? hotFeedback : mockFeedback)" :key="i" class="feedback-card-home" @click="navigateTo(item.detailUrl || '/feedback/list')">
            <div class="feedback-card-cover" :style="{ background: item.bg }">
              <span class="feedback-category-badge">{{ item.category }}</span>
              <span class="feedback-status-badge" :class="'fb-status-' + item.status">{{ item.statusText }}</span>
            </div>
            <div class="feedback-card-body">
              <h4 class="feedback-card-title">{{ item.title }}</h4>
              <div class="feedback-card-tags" v-if="item.tags">
                <span class="feedback-tag-item" v-for="t in item.tags" :key="t">{{ t }}</span>
              </div>
              <p class="feedback-card-content">{{ item.content }}</p>
              <div class="feedback-card-footer">
                <span class="feedback-card-user">👤 {{ item.user }}</span>
                <span class="feedback-card-stats">👍{{ item.likeCount }} 💬{{ item.commentCount }}</span>
                <span class="feedback-card-time">{{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能亮点 -->
    <section class="features-section">
      <div class="section-container">
        <div class="features-header">
          <h2 class="section-title">为什么选择我们</h2>
          <p class="section-subtitle">专注于提供最优质的在线学习体验</p>
        </div>
        <div class="features-grid">
          <div class="feature-card" v-for="(feat, i) in features" :key="i">
            <div class="feat-icon" :style="{ background: feat.bg }">
              <component :is="feat.icon" />
            </div>
            <h3 class="feat-title">{{ feat.title }}</h3>
            <p class="feat-desc">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>


    <!-- 广告位 -->
    <section class="ad-section">
      <div class="section-container">
        <div class="ad-wrapper" :class="{ 'ad-expanded': adExpanded }">
          <!-- 收起状态：标题栏 -->
          <div class="ad-bar" @click="adExpanded = !adExpanded">
            <div class="ad-bar-left">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" stroke-width="1.8"/>
                <path d="M10 22l4-8 3 5 2-3 3 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="11" cy="13" r="1.5" fill="currentColor"/>
              </svg>
              <span class="ad-bar-text">广告位招租</span>
              <span class="ad-bar-badge">Banner · 970×250</span>
            </div>
            <div class="ad-bar-toggle">
              <span class="ad-toggle-label">{{ adExpanded ? '收起' : '展开' }}</span>
              <svg class="ad-toggle-icon" :class="{ 'rotated': adExpanded }" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <!-- 展开内容区 -->
          <div class="ad-content" v-show="adExpanded">
            <div class="ad-content-inner">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="6" width="28" height="20" rx="3" stroke="#cbd5e1" stroke-width="1.8"/>
                <path d="M10 22l4-8 3 5 2-3 3 6" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="11" cy="13" r="1.5" fill="#cbd5e1"/>
              </svg>
              <p class="ad-content-tip">此处为预留广告位，尺寸 970×250</p>
              <p class="ad-content-sub">可投放 Banner 图片、视频或自定义 HTML 内容</p>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchConfig } from '~/composables/useHttp'

useHead({
  title: '开源助手',
  meta: [
    { name: 'description', content: '汇聚优质课程、电子书、考试题库与答疑社区，助你高效成长' },
    { name: 'keywords', content: '在线课程,电子书,考试,答疑,学习平台' },
  ],
})

// ===== 功能轮播数据 =====
const carouselItems = ref([])

// 默认数据（后端接口不可用时的兜底）
const defaultCarouselItems = [
  {
    emoji: '⚡',
    iconBg: 'linear-gradient(135deg, #ef4444, #f97316)',
    cardBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    title: '限时秒杀课程',
    subtitle: '热门课程限时低价，错过恢复原价',
    btnText: '立即抢购',
    path: '/seckill',
    feature1: '限时特惠',
    feature1Icon: '🕐',
    feature2: '低至1折',
    feature2Icon: '💰',
    feature3: '每日更新',
    feature3Icon: '🔄',
    isVisible: true,
    tags: [{ icon: '🕐', text: '限时特惠' }, { icon: '💰', text: '低至1折' }, { icon: '🔄', text: '每日更新' }],
  },
  {
    emoji: '👥',
    iconBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    cardBg: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #2563eb 100%)',
    title: '拼团优惠学习',
    subtitle: '邀请好友一起学，享受更低价格',
    btnText: '发起拼团',
    path: '/list/group/1',
    feature1: '邀友同学',
    feature1Icon: '👋',
    feature2: '最高7折',
    feature2Icon: '🏷️',
    feature3: '分享有礼',
    feature3Icon: '🎁',
    isVisible: true,
    tags: [{ icon: '👋', text: '邀友同学' }, { icon: '🏷️', text: '最高7折' }, { icon: '🎁', text: '分享有礼' }],
  },
  {
    emoji: '🚀',
    iconBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    cardBg: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 50%, #a21caf 100%)',
    title: '精选开源项目',
    subtitle: '真实项目案例，边学边练提升实战能力',
    btnText: '查看项目',
    path: '/openproject/list',
    feature1: '真实项目',
    feature1Icon: '📦',
    feature2: '边学边练',
    feature2Icon: '✏️',
    feature3: '精选推荐',
    feature3Icon: '⭐',
    isVisible: true,
    tags: [{ icon: '📦', text: '真实项目' }, { icon: '✏️', text: '边学边练' }, { icon: '⭐', text: '精选推荐' }],
  },
  {
    emoji: '🌐',
    iconBg: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
    cardBg: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0891b2 100%)',
    title: '实用网站导航',
    subtitle: '程序员常用工具站点，一站式收藏',
    btnText: '立即查看',
    path: '/usefull/list',
    feature1: '一站收藏',
    feature1Icon: '📌',
    feature2: '开发工具',
    feature2Icon: '🛠️',
    feature3: '精选站点',
    feature3Icon: '🔍',
    isVisible: true,
    tags: [{ icon: '📌', text: '一站收藏' }, { icon: '🛠️', text: '开发工具' }, { icon: '🔍', text: '精选站点' }],
  },
]

// 从后端加载轮播图数据
async function loadCarouselData() {
  try {
    const res = await $fetch('/homepage/carousel/visible', {
      baseURL: fetchConfig.baseURL,
      headers: {
        appid: fetchConfig.headers.appid,
      },
    })
    if (res && res.data && res.data.length > 0) {
      // 后端返回的数据转换为前端格式
      carouselItems.value = res.data.map(item => ({
        ...item,
        isVisible: item.isVisible === 1 || item.isVisible === true,
        tags: [
          { icon: item.feature1Icon || '✨', text: item.feature1 || '' },
          { icon: item.feature2Icon || '✨', text: item.feature2 || '' },
          { icon: item.feature3Icon || '✨', text: item.feature3 || '' },
        ].filter(t => t.text),
      }))
    } else {
      carouselItems.value = defaultCarouselItems
    }
  } catch (e) {
    console.warn('轮播图接口请求失败，使用默认数据', e)
    carouselItems.value = defaultCarouselItems
  }
}

const ITEMS_PER_PAGE = 4
const carouselPageIndex = ref(0)

const visibleCarouselItems = computed(() => carouselItems.value.filter(item => item.isVisible !== false))
const totalPages = computed(() => Math.ceil(visibleCarouselItems.value.length / ITEMS_PER_PAGE))

const currentPageItems = computed(() => {
  const start = carouselPageIndex.value * ITEMS_PER_PAGE
  return visibleCarouselItems.value.slice(start, start + ITEMS_PER_PAGE)
})

// 管理员判断（TODO: 上线前恢复权限判断）
const isAdmin = computed(() => {
  try {
    const { hasPermission } = usePermission()
    return hasPermission('homepage:carousel:edit')
  } catch (e) {
    return false
  }
})

// 编辑入口跳转到独立页面 /admin/carousel

// 编辑弹窗
const showBannerEditor = ref(false)
const showCardDetail = ref(false)
const editingCardIndex = ref(-1)

// 编辑用的副本数据（不直接修改 carouselItems）
const editingCarouselItems = ref([])

// 删除确认弹窗
const showDeleteConfirm = ref(false)
const confirmDeleteIndex = ref(-1)
const confirmDeleteTitle = ref('')

// 显示/隐藏切换确认
const showVisibilityConfirm = ref(false)
const visibilityTargetIndex = ref(-1)
const visibilityTargetTitle = ref('')
const visibilityTargetVisible = ref(false)

// 保存确认弹窗
const showSaveConfirm = ref(false)
const saveChanges = ref({ added: [], removed: [], edited: [], visibilityChanged: [], reordered: false })

// 保存初始快照用于对比变更
const originalCarouselSnapshot = ref([])

function snapshotCarousel() {
  // 深拷贝当前编辑列表作为快照（用 JSON 确保完全独立）
  originalCarouselSnapshot.value = JSON.parse(JSON.stringify(editingCarouselItems.value.map((item, idx) => ({
    _idx: idx,
    id: item.id || null,
    title: item.title || '',
    subtitle: item.subtitle || '',
    isVisible: item.isVisible !== false,
    sort: item.sort,
    emoji: item.emoji || '',
    iconBg: item.iconBg || '',
    cardBg: item.cardBg || '',
    btnText: item.btnText || '',
    path: item.path || '',
    feature1: item.feature1 || '',
    feature1Icon: item.feature1Icon || '',
    feature2: item.feature2 || '',
    feature2Icon: item.feature2Icon || '',
    feature3: item.feature3 || '',
    feature3Icon: item.feature3Icon || '',
  }))))
  originalCarouselCount.value = editingCarouselItems.value.length
}

const originalCarouselCount = ref(0)
const editingCard = ref(null)

// ===== 预设选项 =====
const emojiPresets = ['⚡', '👥', '🚀', '🌐', '📝', '💬', '🔧', '📡', '📚', '🎯', '🏆', '💡', '🎨', '🔥', '⭐', '🎁', '🛠️', '📊', '🤖', '🎓']

const featureIconPresets = [
  '🕐', '💰', '🔄', '👋', '🏷️', '🎁', '📦', '✏️', '⭐', '📌',
  '🛠️', '🔍', '📋', '🎯', '📊', '🙋', '👨‍🏫', '🤝', '📄', '🤖',
  '🖼️', '📈', '💡', '🗺️', '🔥', '💎', '🎮', '🏅', '📱', '💻',
  '☁️', '🔒', '⚙️', '📐', '🧪', '🎵', '📷', '🌍', '💼', '📮',
]

function insertFeatureIcon(icon) {
  if (!editingCard.value) return
  if (!editingCard.value.feature1Icon) {
    editingCard.value.feature1Icon = icon
  } else if (!editingCard.value.feature2Icon) {
    editingCard.value.feature2Icon = icon
  } else if (!editingCard.value.feature3Icon) {
    editingCard.value.feature3Icon = icon
  }
}

const iconBgPresets = [
  { name: '红橙', value: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { name: '紫蓝', value: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { name: '紫粉', value: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { name: '青蓝', value: 'linear-gradient(135deg, #14b8a6, #06b6d4)' },
  { name: '橙黄', value: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { name: '绿色', value: 'linear-gradient(135deg, #10b981, #059669)' },
  { name: '橙色', value: 'linear-gradient(135deg, #f97316, #f59e0b)' },
  { name: '天蓝', value: 'linear-gradient(135deg, #0ea5e9, #6366f1)' },
  { name: '玫红', value: 'linear-gradient(135deg, #e11d48, #be185d)' },
  { name: '靛青', value: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' },
  { name: '金色', value: 'linear-gradient(135deg, #d97706, #b45309)' },
  { name: '翠绿', value: 'linear-gradient(135deg, #059669, #0d9488)' },
]

const cardBgPresets = [
  { name: '深紫', value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' },
  { name: '深蓝', value: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #2563eb 100%)' },
  { name: '紫红', value: 'linear-gradient(135deg, #3b0764 0%, #7e22ce 50%, #a21caf 100%)' },
  { name: '青绿', value: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0891b2 100%)' },
  { name: '海蓝', value: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)' },
  { name: '靛蓝', value: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)' },
  { name: '暗蓝', value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)' },
  { name: '墨绿', value: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' },
  { name: '暗红', value: 'linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #dc2626 100%)' },
  { name: '暗紫', value: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 50%, #7c3aed 100%)' },
  { name: '深青', value: 'linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0f766e 100%)' },
  { name: '炭灰', value: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)' },
]

async function openBannerEditor() {
  // 从后端拉取全部卡片列表（含隐藏的）用于编辑
  try {
    const token = useCookie('token').value || localStorage.getItem('token') || ''
    const res = await $fetch('/homepage/carousel/list', {
      baseURL: fetchConfig.baseURL,
      method: 'GET',
      headers: {
        appid: fetchConfig.headers.appid,
        token: token,
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
    if (res.code === 200 && res.data) {
      editingCarouselItems.value = res.data.map(item => ({
        ...item,
        isVisible: item.isVisible === 1 || item.isVisible === true,
        tags: [
          { icon: item.feature1Icon || '✨', text: item.feature1 || '' },
          { icon: item.feature2Icon || '✨', text: item.feature2 || '' },
          { icon: item.feature3Icon || '✨', text: item.feature3 || '' },
        ].filter(t => t.text),
      }))
    } else {
      // 接口失败时用本地数据兜底
      editingCarouselItems.value = JSON.parse(JSON.stringify(carouselItems.value))
    }
  } catch (e) {
    console.warn('获取编辑列表失败，使用本地数据', e)
    editingCarouselItems.value = JSON.parse(JSON.stringify(carouselItems.value))
  }
  snapshotCarousel()
  showBannerEditor.value = true
  document.body.style.overflow = 'hidden'
}

function closeBannerEditor() {
  showBannerEditor.value = false
  document.body.style.overflow = ''
}

function openCardDetail(idx) {
  editingCardIndex.value = idx
  editingCard.value = editingCarouselItems.value[idx]
  showCardDetail.value = true
}

function saveCardDetail() {
  // 如果是新增的卡片（editingCardIndex === -1），确认后才加入列表末尾
  if (editingCardIndex.value === -1 && pendingNewItem.value) {
    // 新增卡片始终追加到显示列表末尾，忽略用户填的 sort 值
    const visibleItems = editingCarouselItems.value.filter(item => item.isVisible !== false)
    const hidden = editingCarouselItems.value.filter(item => item.isVisible === false)
    pendingNewItem.value.sort = visibleItems.length + 1
    visibleItems.push(pendingNewItem.value)
    editingCarouselItems.value = [...visibleItems, ...hidden]
    pendingNewItem.value = null
  } else {
    // 编辑已有卡片，根据 sort 值重新排序
    const visible = editingCarouselItems.value.filter(item => item.isVisible !== false)
    const hidden = editingCarouselItems.value.filter(item => item.isVisible === false)
    visible.sort((a, b) => (a.sort || 999) - (b.sort || 999))
    editingCarouselItems.value = [...visible, ...hidden]
  }
  showCardDetail.value = false
}

function moveBannerItem(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= editingCarouselItems.value.length) return
  const items = editingCarouselItems.value
  const temp = items[index]
  items[index] = items[newIndex]
  items[newIndex] = temp
  editingCarouselItems.value = [...items]
}

function removeBannerItem(index) {
  const item = editingCarouselItems.value[index]
  confirmDeleteIndex.value = index
  confirmDeleteTitle.value = item.title || `卡片 #${index + 1}`
  showDeleteConfirm.value = true
}

function confirmDelete() {
  editingCarouselItems.value.splice(confirmDeleteIndex.value, 1)
  showDeleteConfirm.value = false
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

// 添加轮播项的临时数据
const pendingNewItem = ref(null)

function addBannerItem() {
  // 先创建临时数据，不直接加入列表
  pendingNewItem.value = {
    emoji: '🆕',
    iconBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    cardBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    title: '',
    subtitle: '',
    btnText: '查看详情',
    path: '/',
    feature1: '',
    feature2: '',
    feature3: '',
    sort: editingCarouselItems.value.filter(item => item.isVisible !== false).length + 1,
    isVisible: true,
    tags: [
      { icon: '✨', text: '标签1' },
      { icon: '✨', text: '标签2' },
      { icon: '✨', text: '标签3' },
    ],
  }
  editingCardIndex.value = -1
  editingCard.value = pendingNewItem.value
  showCardDetail.value = true
}

function toggleVisibility(index) {
  const item = editingCarouselItems.value[index]
  visibilityTargetIndex.value = index
  visibilityTargetTitle.value = item.title || `卡片 #${index + 1}`
  visibilityTargetVisible.value = item.isVisible === false ? true : false
  showVisibilityConfirm.value = true
}

function confirmToggleVisibility() {
  const idx = visibilityTargetIndex.value
  editingCarouselItems.value[idx].isVisible = visibilityTargetVisible.value
  // 同步更新编辑中的卡片
  if (editingCard.value && editingCardIndex.value === idx) {
    editingCard.value.isVisible = visibilityTargetVisible.value
  }
  // 隐藏的卡片移到列表末尾，显示的卡片保持在前面
  reorderByVisibility()
  showVisibilityConfirm.value = false
}

function reorderByVisibility() {
  const visible = editingCarouselItems.value.filter(item => item.isVisible !== false)
  const hidden = editingCarouselItems.value.filter(item => item.isVisible === false)
  editingCarouselItems.value = [...visible, ...hidden]
}

function toggleCardDetailVisibility() {
  const newState = editingCard.value.isVisible === false ? true : false
  const title = editingCard.value.title || `卡片 #${editingCardIndex.value + 1}`
  visibilityTargetTitle.value = title
  visibilityTargetVisible.value = newState
  visibilityTargetIndex.value = editingCardIndex.value
  showVisibilityConfirm.value = true
}

function computeSaveChanges() {
  const changes = { added: [], removed: [], edited: [], visibilityChanged: [], reordered: false }
  const original = originalCarouselSnapshot.value
  const current = editingCarouselItems.value

  // 用 JSON 序列化做深度对比
  const serialize = (item) => JSON.stringify({
    title: item.title || '', subtitle: item.subtitle || '', emoji: item.emoji || '',
    iconBg: item.iconBg || '', cardBg: item.cardBg || '', btnText: item.btnText || '',
    path: item.path || '', feature1: item.feature1 || '', feature1Icon: item.feature1Icon || '',
    feature2: item.feature2 || '', feature2Icon: item.feature2Icon || '',
    feature3: item.feature3 || '', feature3Icon: item.feature3Icon || '',
    isVisible: item.isVisible !== false,
  })

  // 原始 id 映射
  const originalMap = new Map()
  original.forEach(item => {
    if (item.id) originalMap.set(item.id, serialize(item))
  })

  // 当前 id 集合
  const currentIds = new Set(current.filter(c => c.id).map(c => c.id))

  // 新增的：没有 id 的卡片
  current.forEach((item, i) => {
    if (!item.id) {
      changes.added.push(item.title || `新卡片 #${i + 1}`)
    }
  })

  // 删除的
  original.forEach(orig => {
    if (orig.id && !currentIds.has(orig.id)) {
      changes.removed.push(orig.title || '未命名卡片')
    }
  })

  // 修改的
  current.forEach(curr => {
    if (!curr.id) return
    const origSerialized = originalMap.get(curr.id)
    if (!origSerialized) return
    if (serialize(curr) !== origSerialized) {
      const origItem = original.find(o => o.id === curr.id)
      const origVisible = origItem.isVisible !== false
      const currVisible = curr.isVisible !== false
      if (currVisible !== origVisible) {
        changes.visibilityChanged.push(`${curr.title || '卡片'}：${origVisible ? '显示→隐藏' : '隐藏→显示'}`)
      }
      // 内容字段变化（排除 isVisible）
      const contentSerialize = (item) => JSON.stringify({
        title: item.title || '', subtitle: item.subtitle || '', emoji: item.emoji || '',
        iconBg: item.iconBg || '', cardBg: item.cardBg || '', btnText: item.btnText || '',
        path: item.path || '', feature1: item.feature1 || '', feature1Icon: item.feature1Icon || '',
        feature2: item.feature2 || '', feature2Icon: item.feature2Icon || '',
        feature3: item.feature3 || '', feature3Icon: item.feature3Icon || '',
      })
      if (contentSerialize(curr) !== contentSerialize(origItem)) {
        changes.edited.push(curr.title || '卡片')
      }
    }
  })

  // 排序变化
  const originalIdOrder = original.filter(o => o.id).map(o => o.id)
  const currentIdOrder = current.filter(c => c.id).map(c => c.id)
  if (JSON.stringify(originalIdOrder) !== JSON.stringify(currentIdOrder)) {
    changes.reordered = true
  }

  return changes
}

async function saveBannerItems() {
  // 从后端重新拉取当前数据，和编辑中的数据对比
  const changes = { added: [], removed: [], edited: [], visibilityChanged: [], reordered: false }

  try {
    const token = useCookie('token').value || localStorage.getItem('token') || ''
    const res = await $fetch('/homepage/carousel/list', {
      baseURL: fetchConfig.baseURL,
      method: 'GET',
      headers: {
        appid: fetchConfig.headers.appid,
        token: token,
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    if (res.code === 200 && res.data) {
      const serverData = res.data
      const current = editingCarouselItems.value

      // 序列化函数 - 统一用 || '' 处理 null/undefined
      const serialize = (item) => JSON.stringify({
        title: String(item.title || ''),
        subtitle: String(item.subtitle || ''),
        emoji: String(item.emoji || ''),
        iconBg: String(item.iconBg || ''),
        cardBg: String(item.cardBg || ''),
        btnText: String(item.btnText || ''),
        path: String(item.path || ''),
        feature1: String(item.feature1 || ''),
        feature1Icon: String(item.feature1Icon || ''),
        feature2: String(item.feature2 || ''),
        feature2Icon: String(item.feature2Icon || ''),
        feature3: String(item.feature3 || ''),
        feature3Icon: String(item.feature3Icon || ''),
        isVisible: (item.isVisible === 1 || item.isVisible === true) ? true : false,
      })

      // 后端 id 映射（用 String 做 key 避免类型不匹配）
      const serverMap = new Map()
      serverData.forEach(item => serverMap.set(String(item.id), serialize(item)))

      // 当前 id 集合
      const currentIds = new Set(current.filter(c => c.id).map(c => String(c.id)))

      // 新增的
      current.forEach((item, i) => {
        if (!item.id) {
          changes.added.push(item.title || `新卡片 #${i + 1}`)
        }
      })

      // 删除的
      serverData.forEach(item => {
        if (!currentIds.has(String(item.id))) {
          changes.removed.push(item.title || '未命名卡片')
        }
      })

      // 修改的
      current.forEach(curr => {
        if (!curr.id) return
        const serverSerialized = serverMap.get(String(curr.id))
        if (!serverSerialized) return
        const currSerialized = serialize(curr)
        if (currSerialized !== serverSerialized) {
          const serverItem = serverData.find(s => String(s.id) === String(curr.id))
          const serverVisible = serverItem.isVisible === 1 || serverItem.isVisible === true
          const currVisible = curr.isVisible !== false
          if (serverVisible !== currVisible) {
            changes.visibilityChanged.push(`${curr.title || '卡片'}：${serverVisible ? '显示→隐藏' : '隐藏→显示'}`)
          }
          changes.edited.push(curr.title || '卡片')
        }
      })

      // 排序变化
      const serverIdOrder = serverData.map(s => String(s.id))
      const currentIdOrder = current.filter(c => c.id).map(c => String(c.id))
      if (JSON.stringify(serverIdOrder) !== JSON.stringify(currentIdOrder)) {
        changes.reordered = true
      }
    }
  } catch (e) {
    console.warn('对比变更时获取后端数据失败', e)
  }

  saveChanges.value = changes
  showSaveConfirm.value = true
}

async function confirmSave() {
  showSaveConfirm.value = false

  // 构造提交给后端的数据
  const submitData = editingCarouselItems.value.map((item, idx) => ({
    id: item.id || null,
    sort: idx + 1,
    emoji: item.emoji,
    iconBg: item.iconBg,
    cardBg: item.cardBg,
    title: item.title,
    subtitle: item.subtitle,
    btnText: item.btnText,
    path: item.path,
    feature1: item.feature1,
    feature1Icon: item.feature1Icon,
    feature2: item.feature2,
    feature2Icon: item.feature2Icon,
    feature3: item.feature3,
    feature3Icon: item.feature3Icon,
    isVisible: item.isVisible === false ? 0 : 1,
  }))

  try {
    // 调用后端 saveAll 接口
    const token = useCookie('token').value || localStorage.getItem('token') || ''
    const res = await $fetch('/homepage/carousel/saveAll', {
      baseURL: fetchConfig.baseURL,
      method: 'POST',
      body: submitData,
      headers: {
        'Content-Type': 'application/json',
        appid: fetchConfig.headers.appid,
        token: token,
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    if (res.code === 200 || res.code === 0) {
      // 保存成功后重新从后端拉取最新数据
      await loadCarouselData()
      closeBannerEditor()
    } else {
      alert('保存失败：' + (res.msg || '未知错误'))
    }
  } catch (e) {
    console.error('保存轮播图失败', e)
    alert('保存失败，请检查网络或权限')
  }
}

let carouselTimer = null

function startCarousel() {
  carouselTimer = setInterval(() => {
    carouselPageIndex.value = (carouselPageIndex.value + 1) % totalPages.value
  }, 5000)
}

function pauseCarousel() {
  clearInterval(carouselTimer)
}

function resumeCarousel() {
  startCarousel()
}

function nextSlide() {
  carouselPageIndex.value = (carouselPageIndex.value + 1) % totalPages.value
}

function prevSlide() {
  carouselPageIndex.value = (carouselPageIndex.value - 1 + totalPages.value) % totalPages.value
}

function goToSlide(i) {
  carouselPageIndex.value = i
}

// ===== 首页导航模块路径（从后端获取，用于"查看全部"按钮跳转） =====
const navModuleMap = ref({})

async function loadNavModules() {
  try {
    const res = await $fetch('/homepage/nav/modules', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      // 转为 key -> frontPath 的 map，方便模板直接取用
      res.data.forEach(m => {
        navModuleMap.value[m.key] = m.frontPath
      })
    }
  } catch (e) {
    console.warn('导航模块路径获取失败，使用默认路径', e)
  }
}

// 根据模块 key 获取跳转路径，获取失败时降级到默认路径
function getNavPath(key, fallback) {
  return navModuleMap.value[key] || fallback
}

onMounted(() => {
  loadCarouselData()
  loadNavModules()
  loadHotCourses()
  loadHotBooks()
  loadHotExams()
  loadHotQa()
  loadHotSeckill()
  loadHotGroup()
  loadHotOpenProject()
  loadHotWebsite()
  loadHotInfoGap()
  loadHotTool()
  loadHotFeedback()
  startCarousel()
})

onUnmounted(() => {
  clearInterval(carouselTimer)
})

// ===== 封面颜色 =====
const coverColors = [
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
]

// SVG icon helpers
const IconCourse = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('rect', { x: '3', y: '4', width: '16', height: '14', rx: '2', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M7 9h8M7 13h5', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const IconBook = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('path', { d: 'M4 3h14a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M11 3v16', stroke: 'white', 'stroke-width': '1.5' }),
])
const IconExam = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('rect', { x: '5', y: '2', width: '12', height: '18', rx: '2', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M8 8h6M8 12h6M8 16h3', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const IconQA = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('circle', { cx: '11', cy: '11', r: '8', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M11 7v4M11 15h.01', stroke: 'white', 'stroke-width': '2', 'stroke-linecap': 'round' }),
])
const IconProject = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('path', { d: 'M4 10l7-6 7 6', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M11 4v14M6 14h10', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const IconTool = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('path', { d: 'M17 8l-5 5-5-5', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  h('circle', { cx: '11', cy: '11', r: '8', stroke: 'white', 'stroke-width': '1.5' }),
])
const IconInfo = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('path', { d: 'M3 6h16M3 11h10M3 16h7', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
  h('circle', { cx: '17', cy: '15', r: '3', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M19.5 17.5l2 2', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const IconWebsite = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('rect', { x: '3', y: '4', width: '16', height: '14', rx: '2', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M3 8h16', stroke: 'white', 'stroke-width': '1.5' }),
  h('circle', { cx: '6.5', cy: '6', r: '1', fill: 'white' }),
  h('circle', { cx: '9.5', cy: '6', r: '1', fill: 'white' }),
])
const IconInternal = () => h('svg', { width: 22, height: 22, viewBox: '0 0 22 22', fill: 'none' }, [
  h('circle', { cx: '11', cy: '11', r: '8', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M3 11h16M11 3c-2.5 2.5-2.5 13.5 0 16M11 3c2.5 2.5 2.5 13.5 0 16', stroke: 'white', 'stroke-width': '1.5' }),
])

const quickNavs = [
  { name: '精品课程', desc: '1000+ 视频课程', path: '/course/1', bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: IconCourse },
  { name: '电子书库', desc: '500+ 电子书籍', path: '/list/book/1', bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', icon: IconBook },
  { name: '在线考试', desc: '海量题库练习', path: '/paper/1', bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', icon: IconExam },
  { name: '答疑社区', desc: '专家在线解答', path: '/question_answer/1', bg: 'linear-gradient(135deg, #10b981, #059669)', icon: IconQA },
  { name: '开源项目', desc: '优质开源资源', path: '/openproject/list', bg: 'linear-gradient(135deg, #8b5cf6, #ec4899)', icon: IconProject },
  { name: '实用工具', desc: '效率提升工具', path: '/tool', bg: 'linear-gradient(135deg, #f97316, #f59e0b)', icon: IconTool },
  { name: '信息差', desc: '发现认知盲区', path: '/info_gap/1', bg: 'linear-gradient(135deg, #0ea5e9, #6366f1)', icon: IconInfo },
  { name: '实用网站', desc: '精选优质网站', path: '/usefull/list', bg: 'linear-gradient(135deg, #14b8a6, #06b6d4)', icon: IconWebsite },
  { name: '内部网站', desc: '内部专属资源', path: '/site', bg: 'linear-gradient(135deg, #64748b, #475569)', icon: IconInternal },
]

// ===== 热门课程（对接后端接口） =====
const defaultCourseBgs = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
]

const hotCoursesRaw = ref([])
const hotCourseListUrl = ref('')

async function loadHotCourses() {
  try {
    const res = await $fetch('/homepage/course/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: {
        appid: fetchConfig.headers.appid,
      },
    })
    if (res && res.data && res.data.length > 0) {
      hotCoursesRaw.value = res.data
      // 从后端返回的第一条数据中取列表页路径
      hotCourseListUrl.value = res.data[0]?.listUrl || ''
    }
  } catch (e) {
    console.warn('热门课程接口请求失败，使用默认数据', e)
  }
}

const hotCourses = computed(() => hotCoursesRaw.value.map((course, index) => {
  const bg = defaultCourseBgs[index % defaultCourseBgs.length]
  const coverStyle = course.cover
    ? { backgroundImage: `url(${course.cover}), ${bg}`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg }
  return {
    ...course,
    bg,
    coverStyle,
    coverTitle: course.tags?.[0] || course.title?.substring(0, 4) || '',
    coverSub: course.tags?.join(' · ') || '',
    buyCountText: formatCount(course.buyCount || 0),
    viewsText: formatCount(course.viewCount || 0),
    originPrice: course.tPrice > course.price ? course.tPrice : null,
    rating: String(course.ratingScore || 0),
    serviceContent: course.serviceContent || '',
    tags: course.tags || [],
    videoCount: course.videoCount || 0,
  }
}))

function formatCount(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'W'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

function getLevelLabel(resourceType) {
  const map = { '1': '免费', '2': '付费', '3': '积分', '4': 'VIP', '5': '小班', '6': '内部' }
  return map[resourceType] || '付费'
}

function getLevelClass(resourceType) {
  if (resourceType === '1') return 'level-easy'
  if (resourceType === '4' || resourceType === '5') return 'level-hard'
  return 'level-mid'
}

// Feature icons
// 活动专区数据
const flashsaleItems = [
  { id: 10, title: 'Vue 3 全栈开发实战', emoji: '⚡', bg: 'linear-gradient(135deg,#667eea,#764ba2)', students: '12.4K', heat: '极热', salePrice: 19, originPrice: 199 },
  { id: 11, title: 'Python 机器学习入门', emoji: '🐍', bg: 'linear-gradient(135deg,#f093fb,#f5576c)', students: '8.2K', heat: '火爆', salePrice: 9, originPrice: 99 },
  { id: 12, title: 'Docker 云原生实践', emoji: '🐳', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', students: '5.6K', heat: '热门', salePrice: 29, originPrice: 299 },
  { id: 13, title: 'React 18 企业级项目', emoji: '⚛️', bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', students: '9.1K', heat: '热门', salePrice: 24, originPrice: 249 },
  { id: 14, title: 'MySQL 性能优化', emoji: '🗄️', bg: 'linear-gradient(135deg,#fa709a,#fee140)', students: '6.8K', heat: '较热', salePrice: 17, originPrice: 179 },
]

const groupItems = [
  { id: 20, title: 'Go 微服务开发从零到一', emoji: '🚀', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', groupCount: '3.2K', heat: '极热', groupPrice: 99, originPrice: 229 },
  { id: 21, title: 'Java Spring Boot 3.x', emoji: '☕', bg: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', groupCount: '5.8K', heat: '火爆', groupPrice: 89, originPrice: 199 },
  { id: 22, title: 'UI/UX 设计系统搭建', emoji: '🎨', bg: 'linear-gradient(135deg,#ffecd2,#fcb69f)', groupCount: '2.1K', heat: '热门', groupPrice: 0, originPrice: 0 },
  { id: 23, title: 'Kubernetes 运维实战', emoji: '☸️', bg: 'linear-gradient(135deg,#667eea,#764ba2)', groupCount: '1.9K', heat: '热门', groupPrice: 129, originPrice: 299 },
  { id: 24, title: 'TypeScript 高级编程', emoji: '📘', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', groupCount: '4.4K', heat: '较热', groupPrice: 79, originPrice: 179 },
]

const examItems = [
  { id: 30, title: '前端面试题精选 500 道', emoji: '💻', bg: 'linear-gradient(135deg,#667eea,#764ba2)', count: '500', heat: '极热', passRate: '72%' },
  { id: 31, title: 'Java 后端面试宝典', emoji: '☕', bg: 'linear-gradient(135deg,#f093fb,#f5576c)', count: '680', heat: '火爆', passRate: '68%' },
  { id: 32, title: 'MySQL 数据库考题库', emoji: '🗄️', bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', count: '320', heat: '热门', passRate: '81%' },
  { id: 33, title: 'Linux 运维认证题库', emoji: '🐧', bg: 'linear-gradient(135deg,#fa709a,#fee140)', count: '420', heat: '热门', passRate: '65%' },
  { id: 34, title: 'Python 编程基础测验', emoji: '🐍', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', count: '280', heat: '较热', passRate: '88%' },
]

// ===== 模块区域 Mock 数据（后期对接后端 API 替换） =====

// ===== 精选电子书（对接后端接口） =====
const defaultBookBgs = [
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
]

const hotBooksRaw = ref([])

async function loadHotBooks() {
  try {
    const res = await $fetch('/homepage/book/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: {
        appid: fetchConfig.headers.appid,
      },
    })
    if (res && res.data && res.data.length > 0) {
      hotBooksRaw.value = res.data
    }
  } catch (e) {
    console.warn('精选电子书接口请求失败', e)
  }
}

const hotBooks = computed(() => hotBooksRaw.value.map((book, index) => {
  const bg = defaultBookBgs[index % defaultBookBgs.length]
  const coverStyle = book.cover
    ? { backgroundImage: `url(${book.cover}), ${bg}`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg }
  return {
    ...book,
    bg,
    coverStyle,
    coverTitle: book.tags?.[0] || book.title?.substring(0, 4) || '',
    coverSub: book.tags?.join(' · ') || '',
    subCountText: formatCount(book.subCount || 0),
    price: book.price ?? 0,
    tags: book.tags || [],
    chapterCount: book.chapterCount || 0,
    level: book.level || 1,
    hotScore: book.hotScore || 0,
    detailUrl: `/book/${book.id}`,
  }
}))

// ===== 在线考试（对接后端接口） =====
const defaultExamBgs = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
]

const hotExamsRaw = ref([])

async function loadHotExams() {
  try {
    const res = await $fetch('/homepage/exam/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotExamsRaw.value = res.data
    }
  } catch (e) {
    console.warn('在线考试接口请求失败', e)
  }
}

const hotExams = computed(() => hotExamsRaw.value.map((exam, index) => {
  const bg = defaultExamBgs[index % defaultExamBgs.length]
  const coverStyle = exam.cover
    ? { backgroundImage: `url(${exam.cover}), ${bg}`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg }
  return {
    ...exam,
    bg,
    coverStyle,
    coverTitle: exam.tags?.[0] || exam.title?.substring(0, 4) || '',
    coverSub: exam.tags?.join(' · ') || '',
    collectCountText: formatCount(exam.collectCount || 0),
    tags: exam.tags || [],
    questionCount: exam.questionCount || 0,
    expire: exam.expire || 0,
    passScore: exam.passScore || 0,
    hotScore: exam.hotScore || 0,
    detailUrl: exam.detailUrl || `/paper_test/${exam.id}`,
  }
}))

// ===== 答疑社区（对接后端接口） =====
const defaultQaBgs = [
  'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
  'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)',
  'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
  'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)',
]
const hotQaRaw = ref([])
async function loadHotQa() {
  try {
    const res = await $fetch('/homepage/qa/hot?limit=3', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotQaRaw.value = res.data
    }
  } catch (e) {
    console.warn('答疑社区接口请求失败', e)
  }
}
const hotQa = computed(() => hotQaRaw.value.map((item, index) => ({
  ...item,
  bg: defaultQaBgs[index % defaultQaBgs.length],
  title: item.content ? item.content.substring(0, 50) : '',
  tags: item.resourceType ? [item.resourceType] : [],
  answers: item.answerCount || 0,
  views: formatCount(item.viewCount || 0),
  statusText: item.status === 1 ? '已解决' : item.status === 2 ? '已关闭' : '待回答',
})))

// ===== 限时秒杀（对接后端接口） =====
const hotSeckillRaw = ref([])
async function loadHotSeckill() {
  try {
    const res = await $fetch('/homepage/seckill/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotSeckillRaw.value = res.data
    }
  } catch (e) {
    console.warn('限时秒杀接口请求失败', e)
  }
}
const defaultSeckillBgs = [
  'linear-gradient(135deg,#dc2626,#f97316)',
  'linear-gradient(135deg,#e11d48,#be185d)',
  'linear-gradient(135deg,#b91c1c,#991b1b)',
  'linear-gradient(135deg,#c2410c,#ea580c)',
  'linear-gradient(135deg,#9f1239,#f43f5e)',
]
const hotSeckill = computed(() => hotSeckillRaw.value.map((item, index) => ({
  ...item,
  id: item.itemId,
  title: item.goodsName,
  cover: item.goodsCover,
  salePrice: item.seckillPrice,
  originPrice: item.originPrice,
  bg: defaultSeckillBgs[index % defaultSeckillBgs.length],
  emoji: '⚡',
  discount: item.originPrice && item.seckillPrice
    ? Math.round((item.seckillPrice / item.originPrice) * 10) + '折'
    : '',
  bought: item.stock ? Math.round((item.soldCount || 0) / item.stock * 100) : 0,
  limit: item.limitPerUser || 0,
  detailUrl: item.detailUrl || (item.activityId ? `/seckill/detail/${item.activityId}` : '/seckill'),
})))

// ===== 拼团优惠（对接后端接口） =====
const hotGroupRaw = ref([])
async function loadHotGroup() {
  try {
    const res = await $fetch('/homepage/group/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotGroupRaw.value = res.data
    }
  } catch (e) {
    console.warn('拼团优惠接口请求失败', e)
  }
}
const defaultGroupBgs = [
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(135deg,#ffecd2,#fcb69f)',
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
]
const hotGroup = computed(() => hotGroupRaw.value.map((item, index) => ({
  ...item,
  id: item.groupId,
  bg: defaultGroupBgs[index % defaultGroupBgs.length],
  emoji: '👥',
  groupCount: item.pNum || 3,
  maxNum: item.maxNum || null,
  startTime: item.startTime || null,
  endTime: item.endTime || null,
  groupPrice: item.groupPrice,
  originPrice: item.originPrice,
})))

// ===== 开源项目（对接后端接口） =====
const hotOpenProjectRaw = ref([])
async function loadHotOpenProject() {
  try {
    const res = await $fetch('/homepage/openproject/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotOpenProjectRaw.value = res.data
    }
  } catch (e) {
    console.warn('开源项目接口请求失败', e)
  }
}
const defaultOpenProjectBgs = [
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
]
const hotOpenProject = computed(() => hotOpenProjectRaw.value.map((item, index) => ({
  ...item,
  siteName: item.projectName,
  title: item.projectName,
  description: item.projectDesc,
  siteUrl: item.projectUrl,
  cover: item.projectCover,
  bg: defaultOpenProjectBgs[index % defaultOpenProjectBgs.length],
  emoji: '🚀',
  stars: String(item.starCount || 0),
  forkCount: item.forkCount || 0,
  author: item.authorName || '',
  detailUrl: '/openproject/list',
})))

// ===== 实用网站（对接后端接口） =====
const hotWebsiteRaw = ref([])
async function loadHotWebsite() {
  try {
    const res = await $fetch('/homepage/website/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotWebsiteRaw.value = res.data
    }
  } catch (e) {
    console.warn('实用网站接口请求失败', e)
  }
}
const defaultWebsiteBgs = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]
const hotWebsite = computed(() => hotWebsiteRaw.value.map((item, index) => ({
  ...item,
  bg: defaultWebsiteBgs[index % defaultWebsiteBgs.length],
  emoji: '🔗',
  desc: `${formatCount(item.clickCount || 0)}次访问 · ${item.description || ''}`,
  detailUrl: '/usefull/list',
})))

// ===== 技术信息差（对接后端接口） =====
const hotInfoGapRaw = ref([])
async function loadHotInfoGap() {
  try {
    const res = await $fetch('/homepage/infogap/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotInfoGapRaw.value = res.data
    }
  } catch (e) {
    console.warn('技术信息差接口请求失败', e)
  }
}
const defaultInfoGapBgs = [
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#8b5cf6,#6366f1)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
]
const hotInfoGap = computed(() => hotInfoGapRaw.value.map((item, index) => ({
  ...item,
  bg: defaultInfoGapBgs[index % defaultInfoGapBgs.length],
  emoji: '💡',
  meta: `👍 ${formatCount(item.goodCount || 0)} · ${item.tag || ''}`,
  author: item.userName || '',
  tags: item.tag ? item.tag.split(',').slice(0, 2) : [],
})))

// ===== 实用工具（对接后端接口） =====
const hotToolRaw = ref([])
async function loadHotTool() {
  try {
    const res = await $fetch('/homepage/tool/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotToolRaw.value = res.data
    }
  } catch (e) {
    console.warn('实用工具接口请求失败', e)
  }
}
const defaultToolBgs = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#06b6d4)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
]
const hotTool = computed(() => hotToolRaw.value.map((item, index) => ({
  ...item,
  toolName: item.toolName,
  bg: defaultToolBgs[index % defaultToolBgs.length],
  usageCount: item.totalUsage || 0,
  price: item.price || 0,
  tags: [],
})))

// ===== 用户反馈（对接后端接口） =====
const hotFeedbackRaw = ref([])
async function loadHotFeedback() {
  try {
    const res = await $fetch('/homepage/feedback/hot?limit=5', {
      baseURL: fetchConfig.baseURL,
      headers: { appid: fetchConfig.headers.appid },
    })
    if (res && res.data && res.data.length > 0) {
      hotFeedbackRaw.value = res.data
    }
  } catch (e) {
    console.warn('用户反馈接口请求失败', e)
  }
}
const defaultFeedbackBgs = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#ef4444,#f97316)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
]
const statusTextMap = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已解决', CLOSED: '已关闭' }
const hotFeedback = computed(() => hotFeedbackRaw.value.map((item, index) => ({
  ...item,
  bg: defaultFeedbackBgs[index % defaultFeedbackBgs.length],
  statusText: statusTextMap[item.status] || item.status,
  tags: [],
  user: '',
  content: item.summary || item.title || '',
  time: '',
})))

// 答疑 - 对应 Question: id, userId, content, status, viewCount, followCount
const mockQnA = [
  { id: 1, userId: 101, content: 'Vue3 Composition API 如何优雅管理状态？', status: 2, viewCount: 1280, followCount: 56, replyCount: 12, avatar: '🧑‍💻', user: '前端小王', time: '2小时前', title: 'Vue3 Composition API 如何优雅管理状态？', tags: ['Vue3', 'JavaScript'], answers: 12, views: '1.2K', bg: 'linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%)' },
  { id: 2, userId: 102, content: 'Spring Boot 3.x 启动报错排查思路', status: 1, viewCount: 890, followCount: 34, replyCount: 8, avatar: '👨‍🔬', user: 'Java老李', time: '5小时前', title: 'Spring Boot 3.x 启动报错排查思路', tags: ['Java', 'Spring Boot'], answers: 8, views: '890', bg: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)' },
  { id: 3, userId: 103, content: 'Docker 容器网络不通如何排查？', status: 2, viewCount: 2100, followCount: 78, replyCount: 15, avatar: '🐳', user: '运维小张', time: '1天前', title: 'Docker 容器网络不通如何排查？', tags: ['Docker', '运维'], answers: 15, views: '2.1K', bg: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)' },
]

// 秒杀 - 对应 SysFlashSale: id, title, cover, flashPrice, tPrice, goodsId
const mockFlashsale = [
  { id: 1, title: 'Java零基础入门到精通【2026最新版】', flashPrice: 0.01, tPrice: 399, goodsId: 101, type: '课程', limit: 10, bought: 70, bg: 'linear-gradient(135deg,#dc2626,#f97316)', emoji: '⚡', discount: '1折', salePrice: 0.01, originPrice: 399 },
  { id: 2, title: 'Python数据分析实战', flashPrice: 0.01, tPrice: 299, goodsId: 102, type: '课程', limit: 10, bought: 10, bg: 'linear-gradient(135deg,#e11d48,#be185d)', emoji: '🐍', discount: '1折', salePrice: 0.01, originPrice: 299 },
  { id: 3, title: 'Vue3全家桶实战', flashPrice: 0.02, tPrice: 199, goodsId: 103, type: '课程', limit: 6, bought: 0, bg: 'linear-gradient(135deg,#b91c1c,#991b1b)', emoji: '🐳', discount: '1折', salePrice: 0.02, originPrice: 199 },
  { id: 4, title: 'React 18 企业级项目', flashPrice: 0.01, tPrice: 249, goodsId: 104, type: '课程', limit: 8, bought: 45, bg: 'linear-gradient(135deg,#c2410c,#ea580c)', emoji: '⚛️', discount: '1折', salePrice: 0.01, originPrice: 249 },
  { id: 5, title: 'MySQL 性能调优手册', flashPrice: 0.02, tPrice: 179, goodsId: 105, type: '电子书', limit: 5, bought: 60, bg: 'linear-gradient(135deg,#9f1239,#f43f5e)', emoji: '🗄️', discount: '1折', salePrice: 0.02, originPrice: 179 },
]

// 拼团 - 对应 GroupActivity: id, type, goodsId, price, pNum, startTime, endTime
const mockGroup = [
  { id: 1, goodsId: 201, price: 99, pNum: 3, title: 'Go 微服务开发从零到一', startTime: '2026-01-01', endTime: '2026-12-31', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', emoji: '🚀', groupCount: 3, groupPrice: 99, originPrice: 229 },
  { id: 2, goodsId: 202, price: 89, pNum: 3, title: 'Java Spring Boot 3.x', startTime: '2026-01-01', endTime: '2026-12-31', bg: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', emoji: '☕', groupCount: 3, groupPrice: 89, originPrice: 199 },
  { id: 3, goodsId: 203, price: 59, pNum: 5, title: 'UI/UX 设计系统搭建', startTime: '2026-01-01', endTime: '2026-12-31', bg: 'linear-gradient(135deg,#ffecd2,#fcb69f)', emoji: '🎨', groupCount: 5, groupPrice: 59, originPrice: 149 },
  { id: 4, goodsId: 204, price: 129, pNum: 3, title: 'Kubernetes 运维实战', startTime: '2026-01-01', endTime: '2026-12-31', bg: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '☸️', groupCount: 3, groupPrice: 129, originPrice: 299 },
  { id: 5, goodsId: 205, price: 79, pNum: 2, title: 'TypeScript 高级编程', startTime: '2026-01-01', endTime: '2026-12-31', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', emoji: '📘', groupCount: 2, groupPrice: 79, originPrice: 179 },
]

// 开源项目 - 对应 OshSiteInfo: id, siteName, cover, siteUrl, description, tagList
const mockOpenProjects = [
  { id: 1, siteName: 'osh-text2sql', description: 'AI驱动的自然语言转SQL工具', siteUrl: 'https://github.com/example/osh-text2sql', cover: null, tagList: ['Vue3', 'AI'], bg: 'linear-gradient(135deg,#14b8a6,#06b6d4)', emoji: '🖥️', title: 'osh-text2sql', stars: '0', tech: 'Vue3', forkCount: 0, lastCommit: '2026-05-14', author: 'juege' },
  { id: 2, siteName: 'osh-backend', description: '开源学习平台后端服务', siteUrl: 'https://github.com/example/osh-backend', cover: null, tagList: ['Java', 'Spring Boot'], bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', emoji: '☁️', title: 'osh-backend', stars: '5', tech: 'Java', forkCount: 1, lastCommit: '2026-05-17', author: 'juege' },
  { id: 3, siteName: 'osh-frontend', description: '开源学习平台前端项目', siteUrl: 'https://github.com/example/osh-frontend', cover: null, tagList: ['Vue3', 'Nuxt3'], bg: 'linear-gradient(135deg,#0ea5e9,#3b82f6)', emoji: '🤖', title: 'osh-frontend', stars: '3', tech: 'Vue3', forkCount: 3, lastCommit: '2026-05-17', author: 'juege' },
  { id: 4, siteName: 'osh-qa-assistant', description: 'QA Assistant - 问答助手', siteUrl: 'https://github.com/example/osh-qa', cover: null, tagList: ['Python', 'AI实战'], bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', emoji: '📱', title: 'osh-qa-assistant', stars: '2', tech: 'Python', forkCount: 0, lastCommit: '2026-05-10', author: 'juege' },
  { id: 5, siteName: 'Transvoxel-XNA', description: 'Transvoxel implementation in C#', siteUrl: 'https://github.com/example/transvoxel', cover: null, tagList: ['C#', '图形学'], bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)', emoji: '🚀', title: 'Transvoxel-XNA', stars: '77', tech: 'C#', forkCount: 12, lastCommit: '2026-04-20', author: 'TechLead' },
]

// 实用网站 - 对应 OshPracticalWebsite: id, name, url, description, logoUrl, clickCount, goodCount, collectionCount
const mockWebsites = [
  { id: 1, name: 'Can I Use', url: 'https://caniuse.com', description: '浏览器兼容性查询', logoUrl: null, clickCount: 89200, goodCount: 3200, collectionCount: 1800, bg: 'linear-gradient(135deg,#667eea,#764ba2)', emoji: '🔍', title: 'Can I Use', desc: '89.2K次访问 · 浏览器兼容性查询' },
  { id: 2, name: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Web开发权威文档', logoUrl: null, clickCount: 156000, goodCount: 5600, collectionCount: 4200, bg: 'linear-gradient(135deg,#f093fb,#f5576c)', emoji: '📖', title: 'MDN Web Docs', desc: '156K次访问 · Web开发权威文档' },
  { id: 3, name: 'GitHub', url: 'https://github.com', description: '全球最大代码托管平台', logoUrl: null, clickCount: 320000, goodCount: 8900, collectionCount: 6700, bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', emoji: '🐙', title: 'GitHub', desc: '320K次访问 · 代码托管平台' },
  { id: 4, name: 'Stack Overflow', url: 'https://stackoverflow.com', description: '程序员问答社区', logoUrl: null, clickCount: 245000, goodCount: 7200, collectionCount: 5100, bg: 'linear-gradient(135deg,#fa709a,#fee140)', emoji: '💡', title: 'Stack Overflow', desc: '245K次访问 · 程序员问答社区' },
  { id: 5, name: 'CodePen', url: 'https://codepen.io', description: '在线代码编辑与分享', logoUrl: null, clickCount: 67800, goodCount: 2100, collectionCount: 1500, bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', emoji: '✏️', title: 'CodePen', desc: '67.8K次访问 · 在线代码编辑' },
]

// 信息差 - 对应 OshInfoGap: id, title, tag, content, goodCount, middleCount, badCount
const mockInfoGap = [
  { id: 1, title: 'AI 编程助手效率对比', tag: 'AI工具', content: '主流AI编程工具横评', goodCount: 892, middleCount: 56, badCount: 12, bg: 'linear-gradient(135deg,#ec4899,#f43f5e)', emoji: '🤖', meta: '👍 892 · AI工具', author: '技术达人', tags: ['AI', 'GPT'] },
  { id: 2, title: '2026 前端框架趋势', tag: '前端', content: '前端技术栈选型建议', goodCount: 1240, middleCount: 89, badCount: 23, bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)', emoji: '📊', meta: '👍 1240 · 前端', author: '前端老王', tags: ['Vue', 'React'] },
  { id: 3, title: '远程办公工具推荐', tag: '效率', content: '提升远程协作效率的工具', goodCount: 678, middleCount: 45, badCount: 8, bg: 'linear-gradient(135deg,#f59e0b,#f97316)', emoji: '🏠', meta: '👍 678 · 效率', author: '效率控', tags: ['协作', '工具'] },
  { id: 4, title: '云服务器选购指南', tag: '运维', content: '各大云厂商性价比对比', goodCount: 1560, middleCount: 102, badCount: 34, bg: 'linear-gradient(135deg,#14b8a6,#06b6d4)', emoji: '☁️', meta: '👍 1560 · 运维', author: '运维小张', tags: ['云计算', 'DevOps'] },
  { id: 5, title: '副业接单平台汇总', tag: '赚钱', content: '程序员副业渠道整理', goodCount: 2340, middleCount: 156, badCount: 45, bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', emoji: '💰', meta: '👍 2340 · 赚钱', author: '自由职业者', tags: ['副业', '接单'] },
]

// 工具 - 对应 Tool: id, toolName, description, resourceType, accessType, usageCount
const mockTools = [
  { id: 1, toolName: 'AI 代码生成器', description: '基于GPT的智能代码补全工具', resourceType: 'AI工具', tags: ['AI', 'GPT'], usageCount: 12800, price: 0, bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 2, toolName: 'SQL 可视化编辑器', description: '拖拽式SQL语句生成', resourceType: '开发工具', tags: ['SQL', '数据库'], usageCount: 8900, price: 0, bg: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' },
  { id: 3, toolName: 'API 接口测试', description: '在线接口调试与文档生成', resourceType: '开发工具', tags: ['API', '测试'], usageCount: 6700, price: 0, bg: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 4, toolName: '正则表达式调试器', description: '可视化正则匹配与测试', resourceType: '开发工具', tags: ['正则', '工具'], usageCount: 5400, price: 0, bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { id: 5, toolName: 'JSON 格式化工具', description: 'JSON美化、压缩、校验', resourceType: '开发工具', tags: ['JSON', '格式化'], usageCount: 15600, price: 0, bg: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
]

// 反馈 - 对应 Feedback: id, title, categoryName, status, tags, likeCount, commentCount, viewCount
const mockFeedback = [
  { id: 1, title: '希望增加课程学习进度同步功能', category: '其它', status: 'processing', statusText: '处理中', tags: ['课程设计', '课程内容'], user: 'a123', content: '建议增加跨设备学习进度同步功能，我经常在电脑和手机上切换学习...', likeCount: 3, commentCount: 20, viewCount: 0, time: '2026/6/7', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 2, title: '如何修改绑定的手机号', category: '其它', status: 'resolved', statusText: '已解决', tags: ['界面体验'], user: 'a123', content: '我想更换绑定的手机号，但是在个人设置中没有找到修改入口...', likeCount: 0, commentCount: 8, viewCount: 0, time: '2026/4/27', bg: 'linear-gradient(135deg,#10b981,#14b8a6)' },
  { id: 3, title: '视频播放器全屏后无法退出', category: 'Bug反馈', status: 'processing', statusText: '处理中', tags: ['播放器', 'Bug'], user: '前端小王', content: '在Safari浏览器中全屏播放视频后，按ESC无法退出全屏...', likeCount: 12, commentCount: 5, viewCount: 0, time: '2026/5/20', bg: 'linear-gradient(135deg,#ef4444,#f97316)' },
  { id: 4, title: '建议增加学习打卡功能', category: '建议', status: 'pending', statusText: '待处理', tags: ['学习', '打卡'], user: '学习达人', content: '希望能增加每日学习打卡功能，记录学习时长和连续天数...', likeCount: 89, commentCount: 15, viewCount: 0, time: '2026/5/15', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { id: 5, title: '移动端页面适配问题', category: 'Bug反馈', status: 'resolved', statusText: '已解决', tags: ['移动端', '适配'], user: '测试员', content: '在iPhone 15 Pro上部分页面底部被遮挡，无法点击按钮...', likeCount: 23, commentCount: 6, viewCount: 0, time: '2026/5/10', bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
]

// 套餐对比数据
const basicPlans = [
  {
    name: '免费',
    emoji: '🎁',
    tagline: '零门槛学习，网站专属功能',
    bg: 'linear-gradient(135deg, #10b981, #059669)',
    price: 0,
    unit: '',
    btnText: '立即免费学习',
    btnColor: '#10b981',
    action: '/course/1',
    features: [
      { text: '免费公开课程', included: true },
      { text: '电子书下载', included: true },
      { text: '社区答疑参与', included: true },
      { text: '基础题库练习', included: true },
      { text: '信息差发布', included: true },
      { text: '开源项目学习', included: true },
      { text: '实用网站浏览', included: true },
      { text: '付费精品课程', included: false },
      { text: 'VIP 专属内容', included: false },
      { text: '觉哥包就业小班服务', included: false },
    ],
  },
  {
    name: '付费课程',
    emoji: '📚',
    tagline: '按需购买，灵活学习',
    bg: 'linear-gradient(135deg, #f59e0b, #f97316)',
    price: 18,
    unit: '- 99 / 门',
    btnText: '浏览付费课程',
    btnColor: '#f97316',
    action: '/course/1',
    features: [
      { text: '免费功能', included: true },
      { text: '付费精品课程', included: true },
      { text: '付费专属课程考试', included: true },
      { text: '付费专属课程答疑', included: true },
      { text: 'VIP 专属内容', included: false },
      { text: '觉哥包就业小班服务', included: false },
    ],
  },
]

const adExpanded = ref(false)

// 公告栏数据
const noticePaused = ref(false)
const noticePaused2 = ref(false)
const notices = [
  { text: '🎉 平台全新改版上线，体验更流畅！欢迎反馈意见', color: '#6366f1' },
  { text: '📚 新增 500+ 电子书，涵盖前端、后端、AI 方向', color: '#10b981' },
  { text: '⚡ 秒杀专区每日 10:00 准时开抢，低至 1 折', color: '#ef4444' },
  { text: '👥 拼团活动进行中，邀请好友最高享 7 折优惠', color: '#f59e0b' },
  { text: '🏆 答疑社区上线，专家在线实时解答你的问题', color: '#8b5cf6' },
  { text: '🔥 Vue3 + TypeScript 全栈实战课程限时特惠 ¥19', color: '#ec4899' },
  { text: '🎓 在线考试系统全面升级，支持智能组卷和错题回顾', color: '#0ea5e9' },
  { text: '💡 新增 Docker + K8s 云原生实战课程，企业级项目实操', color: '#14b8a6' },
]

const notices2 = [
  { text: '📢 Spring Boot 3.x 微服务架构课程上新，限时 8 折', color: '#ef4444' },
  { text: '🎯 每周五晚 8 点直播答疑，名师在线互动', color: '#6366f1' },
  { text: '🌟 优秀学员作品展示，快来投票点赞', color: '#f59e0b' },
  { text: '📝 在线考试新增错题本功能，智能复习更高效', color: '#10b981' },
  { text: '🚀 React 18 + Next.js 企业级项目实战课程已上线', color: '#8b5cf6' },
  { text: '💰 邀请好友注册，双方各得 20 元优惠券', color: '#ec4899' },
]

const vipPeriod = ref('year')
const vipPeriods = [
  { key: 'year', label: '年度', price: 188, unit: '年', save: null },
]
const vipCurrentPrice = computed(() => vipPeriods.find(p => p.key === vipPeriod.value)?.price)
const vipCurrentLabel = computed(() => vipPeriods.find(p => p.key === vipPeriod.value)?.unit)
const vipFeatures = ['全站免费 + 付费课程', 'VIP 专属直播课', '专属题库全解锁', '优先答疑通道', '学习进度云同步','内部网站浏览']

// 小班专属亮点
const classHighlights = [
  { icon: '👥', title: '试用期包过-就业全流程陪伴', desc: '针对每个人技术路径规划,提供面试指导-入职-试用期技术支持' },
  { icon: '💬', title: '小班专属技术培训', desc: '每周定期培训，模拟答复' },
  { icon: '📋', title: '公司级商用项目实战', desc: '支持商用级项目实战带教，中-高级开发技术路线实践' },
]
const classFeatures = ['含全部付费课程权限', '网站全功能权限', '专人带教 + 小班技术培训', '简历指导+模拟面试+入职服务', '试用期陪伴', '终身回看']

// 小班展开内容
const classExpanded = ref(false)
const classStudents = [
  '应届毕业生 → 3个月拿到offer，入职中大型互联网公司',
  '转行学员 → 从零基础到独立完成企业级项目开发',
  '1-3年经验 → 技术瓶颈突破，薪资涨幅30%-50%',
  '在职提升 → 边工作边学习，系统补齐技术短板',
]
const classTechPath = [
  { title: '基础夯实', desc: '前端/后端核心技术体系梳理，查漏补缺' },
  { title: '项目实战', desc: '参与公司级商用项目，积累真实开发经验' },
  { title: '代码Review', desc: '一对一代码审查，培养工程化编码习惯' },
  { title: '模拟面试', desc: '真实面试场景模拟，针对性查缺补漏' },
  { title: '入职护航', desc: '入职后试用期全程技术支持，确保顺利转正' },
]

// Feature icons
const FeatIcon1 = () => h('svg', { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }, [
  h('path', { d: 'M14 3l10 5.5v11L14 25 4 19.5v-11L14 3z', stroke: 'white', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }),
  h('path', { d: 'M14 3v22M4 8.5l10 6 10-6', stroke: 'white', 'stroke-width': '1.5' }),
])
const FeatIcon2 = () => h('svg', { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }, [
  h('circle', { cx: '14', cy: '14', r: '10', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M14 8v6l4 3', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const FeatIcon3 = () => h('svg', { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }, [
  h('circle', { cx: '10', cy: '10', r: '4', stroke: 'white', 'stroke-width': '1.5' }),
  h('circle', { cx: '20', cy: '10', r: '4', stroke: 'white', 'stroke-width': '1.5' }),
  h('path', { d: 'M4 22c0-3 2.5-5 6-5s6 2 6 5M14 22c0-3 2.5-5 6-5s6 2 6 5', stroke: 'white', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
])
const FeatIcon4 = () => h('svg', { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'none' }, [
  h('path', { d: 'M14 3l2.5 7H23l-5.5 4 2 7L14 17l-5.5 4 2-7L5 10h6.5L14 3z', fill: 'white', stroke: 'white', 'stroke-width': '1', 'stroke-linejoin': 'round' }),
])

const features = [
  { title: '系统化课程体系', desc: '从入门到精通，覆盖前端、后端、运维、AI 等多个技术方向，循序渐进地提升你的技能。', bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: FeatIcon1 },
  { title: '随时随地学习', desc: '支持多端同步，PC、手机、平板均可流畅学习，利用碎片时间高效提升。', bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', icon: FeatIcon2 },
  { title: '活跃学习社区', desc: '加入数万名学习者，互相交流、答疑解惑，共同成长，不再孤独学习。', bg: 'linear-gradient(135deg, #10b981, #059669)', icon: FeatIcon3 },
  { title: '名师精心打造', desc: '所有课程均由行业一线专家录制，内容实战导向，学完即可上手项目。', bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', icon: FeatIcon4 },
]
</script>

<style scoped>
/* ===== 全局变量 ===== */
.home-page {
  --accent: #3b82f6;
  --accent-light: rgba(59, 130, 246, 0.1);
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --border: #e2e8f0;
  --text-1: #0f172a;
  --text-2: #334155;
  --text-3: #3b82f6;
  background: linear-gradient(180deg, #faf5ff 0%, #f5f3ff 100%);
  min-height: 100vh;
  padding-top: 0;
  margin-top: -24px;
}

/* ===== Hero Banner - 2x2 Grid ===== */
.hero-section {
  position: relative;
  overflow: hidden;
  padding: 0;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  margin: 0;
  margin-top: 12px;
  border-radius: 0;
  height: 480px;
}

/* 管理员编辑入口按钮 */
.carousel-edit-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 0 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.carousel-edit-btn:hover {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 内容层 */
.hero-content {
  position: relative;
  z-index: 2;
}

/* 底部指示点 */
.hero-footer {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 左右箭头 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  opacity: 0;
}

.hero-section:hover .carousel-arrow {
  opacity: 1;
}

.carousel-arrow-left {
  left: 8px;
}

.carousel-arrow-right {
  right: 8px;
}

.carousel-arrow:hover {
  background: #ffffff;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

/* 2x2 网格 */
.carousel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  border-radius: 0;
  overflow: hidden;
  height: 480px;
}

/* 网格卡片 */
.carousel-grid-card {
  position: relative;
  padding: 36px 40px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.3s ease;
  min-height: 210px;
}

.carousel-grid-card:hover {
  filter: brightness(1.08);
}

.carousel-grid-card-placeholder {
  pointer-events: none;
}

/* 卡片装饰 - 右上角光晕 */
.grid-card-deco {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

/* 卡片左侧 */
.grid-card-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding-left: 40px;
}

.grid-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.grid-card-emoji {
  font-size: 24px;
  line-height: 1;
}

.grid-card-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.grid-card-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.5;
}

.grid-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 7px 16px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 18px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-card-btn:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.45);
}

/* 卡片右侧标签 */
.grid-card-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

.grid-card-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.grid-tag-icon {
  font-size: 13px;
  line-height: 1;
}

.grid-tag-text {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  white-space: nowrap;
}

/* 指示点 */
.carousel-dots {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}

.carousel-dot.active {
  width: 20px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
}

/* 过渡动画 */
.carousel-fade-enter-active,
.carousel-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.carousel-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.carousel-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* ===== 轮播图编辑弹窗 ===== */
.banner-editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.banner-editor-modal {
  background: #fff;
  border-radius: 16px;
  width: 760px;
  max-width: 92vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,0.2);
}
.banner-editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.banner-editor-header h3 { margin: 0; font-size: 17px; font-weight: 700; color: #1f2937; }
.banner-editor-count { font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 2px 8px; border-radius: 10px; }
.banner-editor-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: #f3f4f6; color: #6b7280; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: auto; transition: all 0.2s; }
.banner-editor-close:hover { background: #e5e7eb; color: #1f2937; }
.banner-editor-body { flex: 1; overflow-y: auto; padding: 18px 24px; }
.banner-editor-list { display: flex; flex-direction: column; gap: 12px; }
.banner-editor-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; transition: all 0.2s; }
.banner-editor-item:hover { border-color: #c7d2fe; background: #faf9ff; }
.banner-editor-item-num { width: 22px; height: 22px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 14px; }
.banner-editor-item-preview { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px; }
.banner-editor-item-emoji { font-size: 24px; }
.banner-editor-item-form { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.banner-editor-form-row { display: flex; gap: 8px; }
.banner-editor-input { flex: 1; padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; color: #1f2937; background: #fff; transition: border-color 0.2s; }
.banner-editor-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.08); }
.banner-editor-input-title { font-weight: 600; }
.banner-editor-input-emoji { width: 48px; flex: none; text-align: center; font-size: 16px; }
.banner-editor-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.banner-editor-tags-label { font-size: 11px; color: #9ca3af; }
.banner-editor-tag { display: flex; align-items: center; gap: 2px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 2px 5px; }
.banner-editor-tag-icon-input { width: 22px; border: none; background: transparent; text-align: center; font-size: 12px; padding: 2px; outline: none; }
.banner-editor-tag-text-input { width: 50px; border: none; background: transparent; font-size: 11px; color: #374151; padding: 2px; outline: none; }
.banner-editor-tag-del { width: 16px; height: 16px; border: none; background: transparent; color: #9ca3af; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.banner-editor-tag-del:hover { background: #fecaca; color: #ef4444; }
.banner-editor-tag-add { width: 20px; height: 20px; border: 1px dashed #d1d5db; background: transparent; color: #9ca3af; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.banner-editor-tag-add:hover { border-color: #6366f1; color: #6366f1; }
.banner-editor-item-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; margin-top: 4px; }
.banner-editor-action-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.banner-editor-action-btn:hover:not(:disabled) { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
.banner-editor-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.banner-editor-delete:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.banner-editor-add { width: 100%; padding: 11px; margin-top: 12px; border: 2px dashed #d1d5db; border-radius: 10px; background: transparent; color: #6b7280; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.banner-editor-add:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
.banner-editor-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid #e5e7eb; }
.banner-editor-cancel { padding: 7px 18px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.banner-editor-cancel:hover { background: #f3f4f6; }
.banner-editor-save { padding: 7px 22px; border: none; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
.banner-editor-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }

/* 列表项入口区域 */
.banner-editor-item-entry {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.banner-editor-item-entry:hover {
  border-color: #6366f1;
  background: #f5f3ff;
}
.banner-editor-entry-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px; }
.banner-editor-entry-sub { font-size: 12px; color: #6b7280; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banner-editor-entry-meta { display: flex; align-items: center; justify-content: space-between; }
.banner-editor-entry-path { font-size: 11px; color: #9ca3af; }
.banner-editor-entry-hint { font-size: 11px; color: #6366f1; font-weight: 500; }

/* ===== 单卡片详细编辑弹窗 ===== */
.card-detail-modal {
  background: #fff;
  border-radius: 16px;
  width: 860px;
  max-width: 94vw;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,0.2);
}
.card-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.card-detail-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1f2937; }
.card-detail-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
.card-detail-preview {
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.card-detail-preview-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.card-detail-preview-title { font-size: 18px; font-weight: 700; color: #fff; }
.card-detail-preview-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.card-detail-form { display: flex; flex-direction: column; gap: 14px; }
.card-detail-field { display: flex; flex-direction: column; gap: 4px; }
.card-detail-field label { font-size: 12px; font-weight: 500; color: #6b7280; }
.card-detail-input {
  padding: 9px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #fff;
  transition: border-color 0.2s;
}
.card-detail-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.08); }
.card-detail-row { display: flex; gap: 12px; }
.card-detail-row .card-detail-field { flex: 1; }
.card-detail-toggle {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #9ca3af;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: center;
}
.card-detail-toggle.active { background: #ecfdf5; border-color: #10b981; color: #10b981; font-weight: 600; }
.card-detail-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid #e5e7eb;
}

/* ===== 预设选择器 ===== */
.card-detail-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.emoji-options {
  padding: 8px 0;
}
.picker-option-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}
.picker-option-item.active {
  border-color: #6366f1;
}
.emoji-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 8px;
  background: #f3f4f6;
}
.emoji-item:hover {
  background: #e5e7eb;
}
.emoji-item.active {
  background: #ede9fe;
  border-color: #6366f1;
}
.gradient-options {
  padding: 8px 0;
}
.gradient-item {
  width: 72px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.gradient-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.gradient-item.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px #6366f1, 0 4px 12px rgba(99,102,241,0.3);
}
.gradient-label {
  font-size: 10px;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* ===== 删除确认弹窗 ===== */
.delete-confirm-modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  width: 360px;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0,0,0,0.2);
}
.delete-confirm-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.delete-confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}
.delete-confirm-text {
  font-size: 14px;
  color: #374151;
  margin: 0 0 4px;
}
.delete-confirm-sub {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 20px;
}
.delete-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.delete-confirm-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-confirm-btn:hover {
  background: #dc2626;
}

/* ===== 显示/隐藏状态标记 ===== */
.banner-editor-visible-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 14px;
}
.visible-tag-on {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.visible-tag-on:hover {
  background: #d1fae5;
}
.visible-tag-off {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  cursor: pointer;
}
.visible-tag-off:hover {
  background: #fee2e2;
  border-color: #f87171;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}
.banner-editor-item-hidden {
  opacity: 0.6;
}

/* ===== 编辑卡片中的显示/隐藏按钮 ===== */
.card-detail-visibility-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  border: 2px solid;
}
.visibility-btn-on {
  background: #ecfdf5;
  border-color: #10b981;
  color: #059669;
}
.visibility-btn-on:hover {
  background: #d1fae5;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}
.visibility-btn-off {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}
.visibility-btn-off:hover {
  background: #fee2e2;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
.visibility-btn-icon {
  font-size: 20px;
}
.visibility-btn-text {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  text-align: left;
}
.visibility-btn-hint {
  font-size: 11px;
  opacity: 0.7;
  padding: 2px 8px;
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
}

/* ===== 功能标签图标输入 ===== */
.feature-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.feature-icon-input {
  width: 44px !important;
  flex: none !important;
  text-align: center;
  font-size: 16px;
  padding: 9px 6px !important;
}
.feature-icon-hint {
  font-size: 11px;
  color: #9ca3af;
  margin: 4px 0 0;
}
.feature-emoji-picker {
  margin-top: 6px;
  max-height: none;
  overflow-y: visible;
  padding: 4px 0 !important;
}
.emoji-item-sm {
  width: 34px !important;
  height: 34px !important;
  font-size: 18px !important;
  border-radius: 6px !important;
}

/* ===== 保存变更摘要 ===== */
.save-confirm-changes {
  text-align: left;
  margin: 12px 0 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.save-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #374151;
}
.save-change-label {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.save-change-add .save-change-label {
  background: #ecfdf5;
  color: #059669;
}
.save-change-remove .save-change-label {
  background: #fef2f2;
  color: #dc2626;
}
.save-change-edit .save-change-label {
  background: #eff6ff;
  color: #2563eb;
}
.save-change-visibility .save-change-label {
  background: #fef3c7;
  color: #d97706;
}
.save-change-none {
  color: #6b7280;
  font-size: 13px;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .carousel-grid {
    gap: 2px;
  }
  .carousel-grid-card {
    padding: 22px 24px;
    min-height: 140px;
  }
  .grid-card-title {
    font-size: 17px;
  }
  .grid-card-right {
    display: none;
  }
}

@media (max-width: 640px) {
  .carousel-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    gap: 2px;
  }
  .carousel-grid-card {
    padding: 18px 20px;
    min-height: 100px;
  }
  .grid-card-icon {
    width: 34px;
    height: 34px;
  }
  .grid-card-emoji {
    font-size: 18px;
  }
  .grid-card-title {
    font-size: 15px;
  }
  .grid-card-sub {
    display: none;
  }
  .carousel-arrow {
    width: 30px;
    height: 30px;
  }
}



.section-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 90px;
}

.quick-nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.quick-nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
  border-color: var(--accent);
}

.qn-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qn-info {
  flex: 1;
}

.qn-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 2px;
}

.qn-desc {
  font-size: 13px;
  color: var(--text-3);
}

.qn-arrow {
  color: var(--text-3);
  transition: transform 0.2s ease;
}

.quick-nav-card:hover .qn-arrow {
  transform: translateX(3px);
  color: #7c3aed;
}

/* ===== 热门课程 ===== */
.content-section {
  padding: 30px 0;
  background: #fafafa;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}


.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.section-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  background: linear-gradient(135deg, #db2777, #f107a3);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  letter-spacing: 0.05em;
  width: fit-content;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-1);
  margin: 0;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-3);
  margin: 0;
}

.btn-more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-more:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
.btn-more svg {
  transition: transform 0.2s ease;
}

.btn-more:hover svg {
  transform: translateX(3px);
}

/* ===== 课程卡片 ===== */
.course-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.course-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 220px;
  display: flex;
  flex-direction: column;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.course-cover {
  position: relative;
  height: 80px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
}

/* 封面装饰圆 */
.cover-deco-circle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.cover-deco-1 {
  width: 100px;
  height: 100px;
  top: -30px;
  right: -30px;
  background: rgba(255, 255, 255, 0.1);
}

.cover-deco-2 {
  width: 60px;
  height: 60px;
  bottom: -10px;
  left: 20px;
  background: rgba(255, 255, 255, 0.07);
}

.cover-tech-label {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: 3px 10px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.05em;
  width: fit-content;
}

.cover-title-block {
  position: relative;
  z-index: 1;
}

.cover-main-title {
  font-size: 15px;
  font-weight: 800;
  color: white;
  line-height: 1.2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 4px;
}

.cover-sub-title {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.cover-heat {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 100px;
}

.course-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: white;
}

.badge-hot { background: linear-gradient(135deg, #ef4444, #f97316); }
.badge-free { background: linear-gradient(135deg, #10b981, #059669); }
.badge-new { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.badge-sale { background: linear-gradient(135deg, #f59e0b, #ef4444); }

.course-body {
  padding: 8px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.course-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.course-tags-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  margin-bottom: 6px;
}

.course-tag {
  padding: 2px 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-2);
  font-weight: 500;
}

.course-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
  margin: 0 0 2px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-desc {
  font-size: 11px;
  color: #9ca3af;
  margin: 0 0 4px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.course-students {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-3);
}

.course-level {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.level-easy { background: #dcfce7; color: #16a34a; }
.level-mid { background: #fef3c7; color: #d97706; }
.level-hard { background: #fee2e2; color: #dc2626; }

.course-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.course-views-text {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.price-current {
  font-size: 18px;
  font-weight: 700;
  color: #ef4444;
}

.price-free {
  font-size: 16px;
  font-weight: 700;
  color: #10b981;
}

.price-origin {
  font-size: 12px;
  color: var(--text-3);
  text-decoration: line-through;
  margin-left: 6px;
}

.course-rating {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.course-students-inline {
  font-size: 10px;
  color: #6b7280;
  font-weight: 400;
}

.course-footer-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.course-video-inline {
  font-size: 14px;
  color: #6b7280;
}

.course-rating-star {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
}

/* ===== 功能亮点 ===== */
.features-section {
  padding: 60px 0;
  background: linear-gradient(180deg, #faf5ff 0%, #f5f3ff 100%);
  border-top: 2px solid #ede9fe;
  border-bottom: 2px solid #ede9fe;
}

.features-header {
  text-align: center;
  margin-bottom: 48px;
}

.features-header .section-title {
  font-size: 30px;
  margin-bottom: 10px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.feat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.feat-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
  margin: 0 0 10px;
}

.feat-desc {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.7;
  margin: 0;
}

/* ===== 套餐对比 ===== */
.pricing-section {
  padding: 60px 0;
  background: linear-gradient(180deg, #f5f3ff 0%, #faf5ff 100%);
  border-top: 2px solid #ede9fe;
  border-bottom: 2px solid #ede9fe;
}

/* 横向套餐布局 */
.pricing-horizontal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.pricing-h-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: white;
  border-radius: 16px;
  border: 1px solid #e9d5ff;
  padding: 24px 28px;
  gap: 28px;
  min-height: 200px;
  transition: all 0.3s ease;
}
.pricing-h-class {
  flex-direction: column;
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%);
  border: 2px solid #c4b5fd;
}
.ph-top-row {
  display: flex;
  align-items: stretch;
  gap: 28px;
  width: 100%;
}
.pricing-h-vip {
  background: linear-gradient(135deg, #EAEAEA, #D4D4D4, #bfdbfe, #93c5fd);
  border-color: #93c5fd;
}
.pricing-h-vip .ph-title,
.pricing-h-vip .ph-sub,
.pricing-h-vip .ph-price-unit {
  color: #1e293b;
}
.pricing-h-vip .ph-price-num {
  color: #1e40af;
}
.pricing-h-vip .ph-feat-list {
  color: #1e293b;
}
.pricing-h-vip .ph-check {
  background: rgba(30, 64, 175, 0.12);
  color: #1e40af;
}
@keyframes vip-ocean {
  0% { background-position: 0% 50%; }
  25% { background-position: 50% 100%; }
  50% { background-position: 100% 50%; }
  75% { background-position: 50% 0%; }
  100% { background-position: 0% 50%; }
}
.ph-vip-intro {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ph-vip-slogan {
  font-size: 15px;
  font-weight: 700;
  color: #1e40af;
  margin: 0;
}
.ph-vip-desc {
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
  margin: 0;
}
.ph-vip-tip {
  font-size: 12px;
  color: #475569;
  margin: 0;
}
.ph-left {
  min-width: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.ph-badge {
  display: inline-block;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
  width: fit-content;
}
.ph-icon-vip {
  font-size: 32px;
  margin-bottom: 8px;
}
.ph-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0 0 4px;
}
.ph-sub {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px;
}
.ph-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.ph-price-num {
  font-size: 28px;
  font-weight: 800;
  color: #7c3aed;
}
.ph-price-unit {
  font-size: 13px;
  color: #6b7280;
}
.ph-middle {
  flex: 1;
  display: flex;
  align-items: center;
  border-left: 1px solid #e9d5ff;
  border-right: 1px solid #e9d5ff;
  padding: 0 24px;
}
.ph-middle-vip {
  border: none;
  padding: 0 24px;
}
.ph-highlights {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ph-hl {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.ph-hl-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.ph-hl-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.ph-hl-desc {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}
.ph-right {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-left: 0;
  margin-left: -12px;
}
.ph-feat-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #374151;
}
.ph-feat-list li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ph-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #d1fae5;
  color: #059669;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.ph-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  text-align: center;
}
.ph-btn-class {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
}
.ph-btn-class:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}
/* 展开按钮 */
.ph-expand-btn {
  position: absolute;
  top: 2px;
  right: 4px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: #6366f1;
  background: white;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.ph-expand-btn:hover {
  background: rgba(99, 102, 241, 0.15);
}
.ph-expand-icon {
  transition: transform 0.3s;
}
.ph-expand-icon-open {
  transform: rotate(180deg);
}
/* 展开面板 */
.ph-expand-panel {
  width: 100%;
  background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%);
  border-top: 1px dashed #d8b4fe;
  border-radius: 0;
  padding: 24px;
  margin-top: 16px;
}
.ph-expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.ph-expand-block-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0 0 12px;
}
.ph-expand-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #334155;
  margin-bottom: 8px;
  line-height: 1.5;
}
.ph-expand-dot {
  width: 6px;
  height: 6px;
  min-width: 6px;
  border-radius: 50%;
  background: #f59e0b;
  margin-top: 6px;
}
.ph-expand-step {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.ph-expand-step-num {
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ph-expand-step-title {
  font-size: 11px;
  font-weight: 600;
  color: #1e1b4b;
  white-space: nowrap;
}
.ph-expand-step-desc {
  font-size: 10px;
  color: #64748b;
  margin-left: 6px;
}
/* 展开动画 */
.expand-fade-enter-active,
.expand-fade-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
  overflow: hidden;
  max-height: 500px;
}
.expand-fade-enter-from,
.expand-fade-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-fade-enter-to,
.expand-fade-leave-from {
  opacity: 1;
  max-height: 500px;
}
.ph-btn-vip {
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: white;
}
.ph-btn-vip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}
.ph-action {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ===== 新套餐卡样式 ===== */
.pricing-card2 {
  background: #fff;
  border: 1px solid #e9d5ff;
  border-radius: 16px;
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(124,58,237,0.06);
  transition: all 0.2s ease;
}

.pricing-card2:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(124,58,237,0.12);
}

.p2-header {
  text-align: center;
  margin-bottom: 16px;
}

.p2-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin: 0 auto 10px;
}

.p2-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e1b4b;
  margin: 0 0 3px;
}

.p2-tagline {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.p2-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
  border-top: 1px solid #f3e8ff;
  border-bottom: 1px solid #f3e8ff;
  margin-bottom: 14px;
}

.p2-price-free {
  font-size: 24px;
  font-weight: 800;
  color: #10b981;
}

.p2-price-num {
  font-size: 26px;
  font-weight: 800;
  color: #1e1b4b;
}

.p2-price-range-sep {
  font-size: 20px;
  font-weight: 700;
  color: #94a3b8;
  margin: 0 2px;
}

.p2-price-unit {
  font-size: 12px;
  color: #94a3b8;
}

.p2-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
}

.p2-feat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.p2-feat-no {
  color: #9ca3af;
}

.p2-feat-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.p2-check {
  background: #dcfce7;
  color: #16a34a;
}

.p2-cross {
  background: #fee2e2;
  color: #dc2626;
}

.p2-btn {
  width: 100%;
  padding: 11px;
  background: transparent;
  border: 1.5px solid;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.p2-btn:hover {
  opacity: 0.8;
}

.p2-btn-vip {
  background: linear-gradient(135deg, #7c3aed, #a855f7) !important;
  border-color: transparent !important;
  color: white !important;
}

.p2-btn-vip:hover {
  opacity: 0.9 !important;
  box-shadow: 0 4px 14px rgba(124,58,237,0.4);
}

/* VIP tabs */
.vip-tabs2 {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 4px;
  justify-content: center;
}

.vip-tab2 {
  position: relative;
  padding: 5px 10px;
  background: #f3e8ff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vip-tab2:hover {
  background: #ede9fe;
}

.vip-tab2-active {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: white !important;
}

.vip-tab2-save {
  display: block;
  font-size: 9px;
  font-weight: 700;
  margin-top: 1px;
  opacity: 0.9;
}

/* ===== 小班专属新样式 ===== */
.pricing-class-card {
  position: relative;
  background: linear-gradient(160deg, #f5f3ff 0%, #ede9fe 60%, #ddd6fe 100%);
  border-radius: 18px;
  padding: 24px 20px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(79,70,229,0.15);
  border: 1px solid #c4b5fd;
}

.pricing-class-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
  pointer-events: none;
}

.class-medal {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 40px;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
}

.class-top-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
  margin-bottom: 14px;
  width: fit-content;
}

.class-title {
  font-size: 26px;
  font-weight: 800;
  color: #1e1b4b;
  margin: 0 0 4px;
}

.class-sub {
  font-size: 14px;
  color: #475569;
  margin: 0 0 14px;
}

.class-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e9d5ff;
}

.class-price-main {
  font-size: 36px;
  font-weight: 800;
  color: #7c3aed;
}

.class-price-unit {
  font-size: 16px;
  font-weight: 600;
  color: #1e1b4b;
  background: none;
}

.class-highlights {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.class-hl {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.class-hl-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.class-hl-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e1b4b;
  margin-bottom: 1px;
}

.class-hl-desc {
  font-size: 13px;
  color: #64748b;
}

.class-feat-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.class-feat-list li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: #334155;
}

.class-cta-btn {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(245,158,11,0.4);
  margin-bottom: 8px;
}

.class-cta-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245,158,11,0.55);
}

.class-note {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}

.pricing-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pricing-top-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  flex: 1;
}

.pricing-top-row .pricing-card {
  display: flex;
  flex-direction: column;
}

.pricing-top-row .pricing-card .pricing-features {
  flex: 1;
}

.pricing-class-card {
  position: relative;
  background: #ffffff;
  border-radius: 18px;
  padding: 28px 24px 24px;
  overflow: hidden;
  border: 2px solid #6366f1;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
  display: flex;
  flex-direction: column;
}

.pricing-card {
  position: relative;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  padding: 18px 16px 16px;
  transition: all 0.25s ease;
}

.pricing-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.pricing-vip-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
}

.pricing-vip-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.pricing-header {
  text-align: center;
  margin-bottom: 12px;
}

.pricing-vip-card .pricing-header {
  margin-bottom: 0;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pricing-vip-card .pricing-icon {
  margin: 0;
}

.pricing-vip-card .pricing-name,
.pricing-vip-card .pricing-tagline {
  text-align: left;
}

.pricing-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: 0 auto 8px;
}

.pricing-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
  margin: 0 0 2px;
}

.pricing-tagline {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
}

.vip-period-tabs {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.vip-tab {
  position: relative;
  padding: 6px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.vip-tab:hover {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.vip-tab-active {
  background: linear-gradient(135deg, #7c3aed, #db2777);
  border-color: transparent;
  color: white;
}

.vip-save {
  position: absolute;
  top: -8px;
  right: -4px;
  padding: 1px 5px;
  background: #ef4444;
  color: white;
  font-size: 9px;
  font-weight: 700;
  border-radius: 4px;
}

.pricing-vip-card .pricing-price {
  border: none;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}

.pricing-price {
  text-align: center;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.price-tag {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-1);
}

.price-tag.price-free {
  color: #10b981;
  font-size: 20px;
}

.price-unit {
  font-size: 12px;
  color: var(--text-3);
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pricing-features-vip {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  flex: 1;
}

.pricing-features-vip .pricing-feat-item {
  width: auto;
}

.pricing-feat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
}

.pricing-feat-item.feat-disabled {
  color: var(--text-3);
  text-decoration: line-through;
  opacity: 0.5;
}

.feat-icon {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  background: #dcfce7;
  color: #16a34a;
}

.feat-disabled .feat-icon {
  background: #fee2e2;
  color: #dc2626;
}

.pricing-btn {
  width: 100%;
  padding: 9px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.pricing-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

.pricing-btn-featured {
  background: linear-gradient(135deg, #7c3aed, #db2777);
  border-color: transparent;
  color: white;
}

.pricing-btn-featured:hover {
  background: linear-gradient(135deg, #6d28d9, #be185d);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.5);
}

/* 小班专属卡 */
.pricing-class-card::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 100, 100, 0.3) 0%, transparent 70%);
  pointer-events: none;
}

.class-card-top-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  font-size: 12px;
  font-weight: 700;
  border-radius: 100px;
  margin-bottom: 16px;
}

.class-card-header {
  margin-bottom: 16px;
}

.class-card-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.class-card-title {
  font-size: 22px;
  font-weight: 800;
  color: white;
  margin: 0 0 4px;
}

.class-card-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  margin: 0;
}

.class-card-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.class-price-main {
  font-size: 32px;
  font-weight: 800;
  color: #fbbf24;
}

.class-price-unit {
  font-size: 16px;
  font-weight: 600;
  color: #1e1b4b;
  background: none;
}

.class-card-highlights {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  flex: 1;
}

.class-highlight {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.class-highlight-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.class-highlight-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  margin-bottom: 2px;
}

.class-highlight-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
}

.class-card-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin-bottom: 14px;
}

.class-card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.class-card-features li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: rgba(255,255,255,0.75);
}

.class-card-features .feat-icon {
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
}

.class-card-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 10px;
}

.class-card-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.class-card-note {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  margin: 0;
}

@media (max-width: 1100px) {
  .pricing-layout {
    grid-template-columns: 1fr;
  }
  .pricing-vip-card {
    grid-template-columns: 1fr;
  }
  .pricing-vip-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .pricing-top-row {
    grid-template-columns: 1fr;
  }
}

/* ===== 活动专区 ===== */
.promo-section {
  padding: 60px 0;
  background: #ffffff;
  border-top: 2px solid #f0eeff;
  border-bottom: 2px solid #f0eeff;
}

.promo-expand-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}

.promo-expand-card {
  border-radius: 16px;
  overflow: hidden;
}

.promo-flashsale {
  background: linear-gradient(160deg, #1e1b4b 0%, #312e81 100%);
}

.promo-group {
  background: linear-gradient(160deg, #064e3b 0%, #065f46 100%);
}

.promo-exam {
  background: linear-gradient(160deg, #7c2d12 0%, #9a3412 100%);
}

.pec-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.pec-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pec-badge {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(255,255,255,0.15);
  border-radius: 100px;
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  width: fit-content;
}

.pec-title {
  font-size: 20px;
  font-weight: 800;
  color: white;
  margin: 0;
}

.pec-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin: 0;
}

.pec-more-btn {
  padding: 6px 14px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.pec-more-btn:hover {
  background: rgba(255,255,255,0.22);
}

.pec-list {
  padding: 8px 0;
}

.pec-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.pec-item:hover {
  background: rgba(255,255,255,0.06);
}

.pec-rank {
  width: 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.rank-top {
  color: #f59e0b;
}

.pec-cover {
  width: 40px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.pec-info {
  flex: 1;
  min-width: 0;
}

.pec-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.pec-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pec-students {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.pec-heat {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.pec-price-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.pec-sale-price {
  font-size: 15px;
  font-weight: 700;
  color: #fbbf24;
}

.pec-origin-price {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  text-decoration: line-through;
}

.pec-pass-rate {
  font-size: 12px;
  font-weight: 600;
  color: #6ee7b7;
}

@media (max-width: 1100px) {
  .promo-expand-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 公告栏 ===== */
.notice-section {
  padding: 0;
  margin-top: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-bar {
  width: 100%;
  margin: 0;
  padding: 0 12px;
  display: flex;
  align-items: center;
  height: 40px;
  gap: 0;
  overflow: hidden;
  background: linear-gradient(90deg, #fef9c3 0%, #fef3c7 40%, #fce7f3 100%);
  border: 1.5px solid #fbbf24;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
  animation: notice-bar-in 0.5s ease both;
}

@keyframes notice-bar-in {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}

.notice-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 10px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 0 8px 8px 0;
  color: white;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 16px;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.2);
  box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35);
  animation: label-pulse 3s ease-in-out infinite;
}

@keyframes label-pulse {
  0%, 100% { box-shadow: 2px 0 12px rgba(249, 115, 22, 0.35); }
  50%       { box-shadow: 2px 0 20px rgba(249, 115, 22, 0.6); }
}

.notice-scroll-wrap {
  flex: 1;
  overflow: hidden;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
}

.notice-scroll-track {
  display: flex;
  align-items: center;
  white-space: nowrap;
  animation: notice-scroll 60s linear infinite;
}

@keyframes notice-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes notice-scroll-reverse {
  0%   { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

.notice-scroll-track-reverse {
  animation: notice-scroll-reverse 36s linear infinite !important;
}

.notice-bar-2 {
  background: linear-gradient(90deg, #ecfdf5 0%, #e0f2fe 40%, #ede9fe 100%);
  border-color: #6ee7b7;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.notice-label-2 {
  background: linear-gradient(135deg, #10b981, #06b6d4) !important;
  box-shadow: 2px 0 12px rgba(16, 185, 129, 0.35) !important;
}

.notice-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  padding-right: 8px;
  cursor: default;
  transition: color 0.2s ease;
}

.notice-item:hover {
  color: #d97706;
}

.notice-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: dot-blink 2s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.4); }
}

.notice-sep {
  color: #d97706;
  margin: 0 16px 0 8px;
  font-size: 14px;
  opacity: 0.5;
}

.notice-more {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #b45309;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  border-left: 1.5px solid #fbbf24;
  margin-left: 16px;
  transition: color 0.15s ease, gap 0.2s ease;
}

.notice-more:hover {
  color: #92400e;
  gap: 6px;
}

/* ===== 广告位 ===== */
.ad-section {
  padding: 0 0 80px;
}

.ad-wrapper {
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ad-wrapper:hover {
  border-color: #94a3b8;
}

.ad-wrapper.ad-expanded {
  border-color: #94a3b8;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}

.ad-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  background: #f8fafc;
  transition: background 0.15s ease;
}

.ad-bar:hover {
  background: #f1f5f9;
}

.ad-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
}

.ad-bar-text {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.ad-bar-badge {
  font-size: 11px;
  color: #cbd5e1;
  padding: 2px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 100px;
  background: white;
}

.ad-bar-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.ad-toggle-icon {
  transition: transform 0.25s ease;
}

.ad-toggle-icon.rotated {
  transform: rotate(180deg);
}

.ad-content {
  border-top: 1.5px dashed #e2e8f0;
  background: white;
}

.ad-content-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
  min-height: 200px;
}

.ad-content-tip {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  margin: 0;
}

.ad-content-sub {
  font-size: 12px;
  color: #cbd5e1;
  margin: 0;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.35);
}

.btn-outline.btn-lg {
  padding: 16px 36px;
  font-size: 16px;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .feature-nav {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .feature-nav-icon {
    font-size: 28px;
    width: 44px;
    height: 44px;
  }
  .feature-nav-label {
    font-size: 13px;
  }
  .hero-title {
    font-size: 40px;
  }
  .course-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .hero-carousel {
    display: none;
  }
  .hero-title {
    font-size: 38px;
  }
  .quick-nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .course-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .promo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 40px 0 48px;
    border-radius: 0;
    margin: 0;
  }
  .hero-center {
    padding: 40px 16px 32px;
  }
  .feature-nav {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 32px;
  }
  .feature-nav-item {
    padding: 12px 8px;
  }
  .feature-nav-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
  }
  .feature-nav-label {
    font-size: 12px;
  }
  .hero-title {
    font-size: 32px;
  }
  .quick-nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .course-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .promo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 32px 0 40px;
    border-radius: 0;
    margin: 0;
  }
  .hero-center {
    padding: 32px 12px 28px;
  }
  .feature-nav {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 24px;
  }
  .feature-nav-item {
    padding: 10px 6px;
  }
  .feature-nav-icon {
    font-size: 20px;
    width: 36px;
    height: 36px;
  }
  .feature-nav-label {
    font-size: 11px;
  }
  .hero-title {
    font-size: 28px;
  }
  .hero-desc {
    font-size: 14px;
  }
  .quick-nav-grid {
    grid-template-columns: 1fr;
  }
  .course-grid {
    grid-template-columns: 1fr;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .cta-title {
    font-size: 26px;
  }
  .cta-card {
    padding: 48px 24px;
  }
}
</style>

<!-- 太空风格全局覆盖（不用 scoped，通过 data-theme 属性控制） -->
<style>
/* ===== 太空风格 ===== */
[data-theme="space"] body,
[data-theme="space"] {
  --space-bg: #020817;
  --space-surface: #0d1117;
  --space-surface-2: #161b22;
  --space-border: rgba(48, 54, 61, 0.8);
  --space-text-1: #e6edf3;
  --space-text-2: #8b949e;
  --space-text-3: #484f58;
  --space-accent: #58a6ff;
}

/* 页面背景 */
[data-theme="space"] .home-page {
  background: #020817 !important;
  --accent: #58a6ff;
  --accent-light: rgba(88, 166, 255, 0.1);
  --surface: #0d1117;
  --surface-2: #161b22;
  --border: rgba(48, 54, 61, 0.8);
  --text-1: #e6edf3;
  --text-2: #8b949e;
  --text-3: #484f58;
}

/* Hero */
[data-theme="space"] .hero-section {
  background: radial-gradient(ellipse at 20% 50%, #0d2137 0%, #020817 40%, #000510 100%) !important;
  position: relative;
}

[data-theme="space"] .hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 60%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(1px 1px at 85% 70%, rgba(255,255,255,0.5) 0%, transparent 100%),
    radial-gradient(1px 1px at 20% 80%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(1px 1px at 60% 85%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(2px 2px at 40% 30%, rgba(88,166,255,0.6) 0%, transparent 100%),
    radial-gradient(2px 2px at 75% 15%, rgba(88,166,255,0.5) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 90% 50%, rgba(255,255,255,0.7) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

[data-theme="space"] .blob-1 { background: #1d4ed8 !important; opacity: 0.2 !important; }
[data-theme="space"] .blob-2 { background: #0ea5e9 !important; opacity: 0.15 !important; }
[data-theme="space"] .blob-3 { background: #6366f1 !important; opacity: 0.12 !important; }

[data-theme="space"] .hero-badge {
  background: rgba(88, 166, 255, 0.1) !important;
  border-color: rgba(88, 166, 255, 0.3) !important;
  color: #79c0ff !important;
}

[data-theme="space"] .badge-dot { background: #58a6ff !important; }

[data-theme="space"] .hero-highlight {
  background: linear-gradient(135deg, #58a6ff, #79c0ff, #a5d6ff) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

[data-theme="space"] .hero-desc { color: #8b949e !important; }

[data-theme="space"] .btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4) !important;
}

[data-theme="space"] .btn-primary:hover {
  box-shadow: 0 8px 28px rgba(14, 165, 233, 0.55) !important;
}

[data-theme="space"] .stat-num { color: #79c0ff !important; }

/* 快捷导航 */
[data-theme="space"] .quick-nav-card {
  background: #0d1117 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
}

[data-theme="space"] .quick-nav-card:hover {
  border-color: #58a6ff !important;
  box-shadow: 0 8px 24px rgba(88, 166, 255, 0.15) !important;
}

[data-theme="space"] .qn-name { color: #e6edf3 !important; }
[data-theme="space"] .qn-desc { color: #484f58 !important; }

/* 区块标题 */
[data-theme="space"] .section-title { color: #e6edf3 !important; }
[data-theme="space"] .section-subtitle { color: #8b949e !important; }
[data-theme="space"] .section-tag {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
}

/* 课程卡片 */
[data-theme="space"] .course-card {
  background: #0d1117 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
}

[data-theme="space"] .course-card:hover {
  box-shadow: 0 12px 32px rgba(88, 166, 255, 0.12) !important;
}

[data-theme="space"] .course-title { color: #e6edf3 !important; }
[data-theme="space"] .course-tag {
  background: #161b22 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
  color: #8b949e !important;
}

/* 功能亮点 */
[data-theme="space"] .features-section {
  background: linear-gradient(180deg, #020817 0%, #0d1117 100%) !important;
}

[data-theme="space"] .feature-card {
  background: #0d1117 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
}

[data-theme="space"] .feat-title { color: #e6edf3 !important; }
[data-theme="space"] .feat-desc { color: #8b949e !important; }

/* 套餐区 */
[data-theme="space"] .pricing-section {
  background: linear-gradient(180deg, #0d1117 0%, #020817 100%) !important;
}

[data-theme="space"] .pricing-card {
  background: #0d1117 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
}

[data-theme="space"] .pricing-name { color: #e6edf3 !important; }
[data-theme="space"] .pricing-tagline { color: #484f58 !important; }
[data-theme="space"] .price-tag { color: #e6edf3 !important; }
[data-theme="space"] .price-tag.price-free { color: #3fb950 !important; }
[data-theme="space"] .pricing-price { border-color: rgba(48, 54, 61, 0.8) !important; }
[data-theme="space"] .pricing-feat-item { color: #8b949e !important; }
[data-theme="space"] .pricing-btn {
  background: #161b22 !important;
  border-color: rgba(48, 54, 61, 0.8) !important;
  color: #8b949e !important;
}

[data-theme="space"] .pricing-btn:hover {
  border-color: #58a6ff !important;
  color: #58a6ff !important;
  background: rgba(88, 166, 255, 0.08) !important;
}

[data-theme="space"] .pricing-btn-featured {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
  color: white !important;
}

[data-theme="space"] .pricing-class-card {
  background: linear-gradient(160deg, #020817 0%, #0d2137 50%, #0c1a3a 100%) !important;
  border-color: rgba(88, 166, 255, 0.25) !important;
  box-shadow: 0 8px 32px rgba(88, 166, 255, 0.15) !important;
}

[data-theme="space"] .class-card-btn {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4) !important;
}

[data-theme="space"] .vip-tab-active {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
}

/* CTA */
[data-theme="space"] .cta-card {
  background: radial-gradient(ellipse at center, #0d2137 0%, #020817 70%) !important;
  border: 1px solid rgba(88, 166, 255, 0.15);
}

[data-theme="space"] .cta-blob-1 { background: #1d4ed8 !important; }
[data-theme="space"] .cta-blob-2 { background: #0ea5e9 !important; }

/* 导航栏太空风格 */
[data-theme="space"] .navbar {
  background: linear-gradient(180deg, #020817 0%, #0d1117 100%) !important;
  border-bottom-color: rgba(88, 166, 255, 0.1) !important;
}

[data-theme="space"] .nav-item.active {
  color: #58a6ff !important;
  background: rgba(88, 166, 255, 0.08) !important;
}

[data-theme="space"] .nav-item.active::after {
  background: #58a6ff !important;
}

[data-theme="space"] .btn-login {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9) !important;
}

/* ===== 新模块通用样式 ===== */
.module-grid {
  display: grid;
  gap: 14px;
}
.module-grid-5 {
  grid-template-columns: repeat(5, 1fr);
}
.module-grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.module-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 220px;
}
.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

/* 电子书卡片样式 */
.book-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 220px;
  display: flex;
  flex-direction: column;
}
.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}
.book-card-cover {
  position: relative;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.book-card-emoji {
  font-size: 32px;
}
.book-card-level {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  background: rgba(255,255,255,0.9);
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #6366f1;
}
.book-card-type {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
}
.type-paid {
  background: #fbbf24;
  color: #92400e;
}
.type-free {
  background: #34d399;
  color: #065f46;
}
.book-card-body {
  padding: 8px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.book-card-row {
  display: flex;
  gap: 8px;
  flex: 1;
}
.book-card-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.book-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
}
.book-card-chapters {
  font-size: 12px;
  color: #6b7280;
  margin-top: auto;
}
.book-card-tags-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.book-card-tags-right .book-card-tag {
  text-align: center;
}
.book-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 3px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.book-card-desc {
  font-size: 11px;
  color: #9ca3af;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.book-card-tags {
  display: none;
}
.book-card-tag {
  padding: 1px 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-size: 10px;
  color: #2563eb;
  font-weight: 500;
}
.book-card-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.book-stat {
  background: #f3f4f6;
  border-radius: 6px;
  padding: 3px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.book-stat-label {
  font-size: 9px;
  color: #9ca3af;
}
.book-stat-value {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}
.book-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.book-card-price {
  font-size: 15px;
  font-weight: 700;
  color: #ef4444;
}
.book-card-price-free {
  color: #10b981;
}
.book-card-chapters {
  font-size: 12px;
  color: #6b7280;
}

.module-card-cover {
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}
.module-card-emoji {
  font-size: 42px;
}
.module-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  font-size: 11px;
  color: white;
  font-weight: 500;
}
.module-card-discount {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  background: #ef4444;
  border-radius: 10px;
  font-size: 11px;
  color: white;
  font-weight: 700;
}

/* 秒杀卡片 - 匹配秒杀模块风格 */
.seckill-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  min-height: 220px;
  overflow: hidden;
}
.seckill-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.seckill-card-cover {
  position: relative;
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.seckill-card-emoji {
  font-size: 28px;
}
.seckill-card-body {
  padding: 8px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.seckill-card-header {
  margin-bottom: 8px;
}
.seckill-limit {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
  background: rgba(255,255,255,0.9);
  padding: 2px 8px;
  border-radius: 4px;
}
.seckill-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
  line-height: 1.4;
  height: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.seckill-card-price {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
}
.seckill-origin {
  font-size: 10px;
  color: #9ca3af;
  text-decoration: line-through;
}
.seckill-flash {
  font-size: 15px;
  font-weight: 700;
  color: #dc2626;
}
.seckill-type {
  font-size: 9px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 500;
}
.seckill-buy-limit {
  font-size: 9px;
  background: #fef3c7;
  color: #b45309;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 500;
}
.seckill-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.seckill-progress-bar {
  flex: 1;
  height: 6px;
  background: #fee2e2;
  border-radius: 3px;
  overflow: hidden;
}
.seckill-progress-fill {
  height: 100%;
  background: #dc2626;
  border-radius: 3px;
  transition: width 0.3s;
}
.seckill-progress-text {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}
.seckill-btn {
  margin-top: auto;
  width: 100%;
  padding: 6px 0;
  border: none;
  border-radius: 6px;
  background: #dc2626;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.seckill-btn:hover {
  background: #b91c1c;
}

/* 拼团优惠卡片 */
.group-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  padding: 12px;
  height: 300px;
  overflow: hidden;
}
.group-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(99,102,241,0.13);
  border-color: #6366f1;
}
.group-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}
.group-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e1b4b;
  line-height: 1.4;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.group-card-badge {
  flex-shrink: 0;
  background: #6366f1;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 20px;
  white-space: nowrap;
}
.group-card-price-row,
.group-card-origin-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
}
.group-card-label {
  font-size: 11px;
  color: #9ca3af;
  width: 26px;
  flex-shrink: 0;
}
.group-card-price {
  font-size: 18px;
  font-weight: 700;
  color: #ef4444;
}
.group-card-origin {
  font-size: 12px;
  color: #9ca3af;
  text-decoration: line-through;
}
.group-card-progress-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  margin-bottom: 8px;
}
.group-card-progress-bar {
  flex: 1;
  height: 5px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.group-card-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.group-card-progress-text {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}
.group-card-btn {
  width: 100%;
  padding: 7px 0;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.group-card-btn:hover {
  background: #4f46e5;
}
.group-card-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.group-card-info-label {
  font-size: 11px;
  color: #9ca3af;
  width: 42px;
  flex-shrink: 0;
}
.group-card-info-val {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}
.group-card-time-block {
  background: #f0f4ff;
  border-radius: 6px;
  padding: 5px 8px;
  margin-bottom: 6px;
}
.group-card-time-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.group-card-time-row:last-child {
  margin-bottom: 0;
}
.group-card-time-label {
  font-size: 10px;
  color: #6366f1;
  width: 42px;
  flex-shrink: 0;
}
.group-card-time-val {
  font-size: 10px;
  color: #374151;
}

/* 开源项目卡片 */
.openproj-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  overflow: hidden;
}
.openproj-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.openproj-card-cover {
  position: relative;
  height: 65px;
  flex-shrink: 0;
}
.openproj-status-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 600;
  background: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
}
.openproj-star-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
  padding: 2px 8px;
  border-radius: 10px;
}
.openproj-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.openproj-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.openproj-card-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.openproj-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #ede9fe;
  color: #6d28d9;
  font-weight: 500;
}
.openproj-card-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.openproj-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}
.openproj-author {
  font-weight: 500;
  color: #374151;
}
.openproj-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.openproj-link {
  font-size: 11px;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
}
.openproj-link:hover {
  color: #4f46e5;
}
.openproj-stat {
  font-weight: 500;
}
.openproj-date {
  font-size: 10px;
  color: #9ca3af;
}

/* 实用网站卡片 */
.website-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  overflow: hidden;
}
.website-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.website-card-cover {
  position: relative;
  height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.website-card-emoji {
  font-size: 24px;
}
.website-good-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
  padding: 2px 8px;
  border-radius: 10px;
}
.website-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.website-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.website-card-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.website-card-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}
.website-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}
.website-visit-link {
  font-size: 11px;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
}
.website-visit-link:hover {
  color: #4f46e5;
}
.website-stat {
  font-weight: 500;
}

/* 信息差卡片 */
.infogap-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  overflow: hidden;
}
.infogap-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.infogap-card-cover {
  position: relative;
  height: 65px;
  flex-shrink: 0;
}
.infogap-tag-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
  padding: 2px 10px;
  border-radius: 10px;
}
.infogap-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.infogap-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.infogap-card-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.infogap-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}
.infogap-stat {
  font-weight: 500;
}
.infogap-stat.good { color: #10b981; }
.infogap-stat.mid { color: #f59e0b; }
.infogap-stat.bad { color: #ef4444; }
.infogap-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.infogap-tag-item {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #fce7f3;
  color: #be185d;
  font-weight: 500;
}
.infogap-author {
  font-size: 11px;
  color: #374151;
  font-weight: 500;
}

/* 工具卡片 */
.tool-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  overflow: hidden;
}
.tool-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.tool-card-cover {
  position: relative;
  height: 65px;
  flex-shrink: 0;
}
.tool-card-type {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
  padding: 2px 8px;
  border-radius: 10px;
}
.tool-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.tool-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tool-card-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tool-card-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}
.tool-tag-item {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 500;
}
.tool-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}
.tool-card-usage {
  color: #6b7280;
}
.tool-card-price {
  font-weight: 700;
  color: #10b981;
}

/* 反馈卡片 */
.feedback-card-home {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
  overflow: hidden;
}
.feedback-card-home:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.feedback-card-cover {
  position: relative;
  height: 65px;
  flex-shrink: 0;
}
.feedback-category-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
  padding: 2px 8px;
  border-radius: 10px;
}
.feedback-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}
.fb-status-pending {
  background: #fef3c7;
  color: #92400e;
}
.fb-status-processing {
  background: #dbeafe;
  color: #1d4ed8;
}
.fb-status-resolved {
  background: #d1fae5;
  color: #065f46;
}
.feedback-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.feedback-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feedback-card-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}
.feedback-tag-item {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #ecfdf5;
  color: #065f46;
  font-weight: 500;
}
.feedback-card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #6b7280;
}
.feedback-card-user {
  font-weight: 500;
  color: #374151;
}
.feedback-card-stats {
  color: #6b7280;
}
.feedback-card-content {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feedback-card-time {
  margin-left: auto;
  font-size: 10px;
  color: #9ca3af;
}

/* 在线考试 - 卡片样式（同电子书结构） */
.exam-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}
.exam-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.exam-card-cover {
  position: relative;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.exam-card-emoji {
  font-size: 36px;
}
.exam-card-count {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  color: #374151;
}
.exam-card-pass {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.85);
  color: #374151;
}
.exam-card-body {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.exam-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.exam-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.exam-card-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  background: #f0f4ff;
  color: #3b62ff;
}
.exam-card-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.exam-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.exam-stat-label {
  font-size: 10px;
  color: #9ca3af;
}
.exam-stat-value {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}
.exam-card-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}
.exam-card-expire {
  font-size: 13px;
  color: #f43f5e;
  font-weight: 700;
}

.module-card-body {
  padding: 8px 10px;
}
.module-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.module-card-meta {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}
.module-card-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price-sale {
  font-size: 15px;
  font-weight: 700;
  color: #ef4444;
}
.price-origin {
  font-size: 11px;
  color: #9ca3af;
  text-decoration: line-through;
}

/* 答疑社区卡片 - 匹配答疑模块UI */
.qna-card {
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 220px;
}
.qna-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}
.qna-card.qna-answered {
  border-left: 3px solid #10b981;
}
.qna-card.qna-pending {
  border-left: 3px solid #f59e0b;
  background: linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%) !important;
}
.qna-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.qna-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.qna-card-views {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 600;
}
.qna-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}
.qna-meta-user, .qna-meta-time {
  display: flex;
  align-items: center;
  gap: 4px;
}
.qna-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.qna-card-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 10px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.qna-meta-tag {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255,255,255,0.7);
  color: #3b62ff;
}
.qna-card-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.qna-bottom-stat {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}
.qna-status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  margin-left: auto;
}
.qna-status-solved {
  background: #d1fae5;
  color: #065f46;
}
.qna-status-open {
  background: #fef3c7;
  color: #92400e;
}
</style>
