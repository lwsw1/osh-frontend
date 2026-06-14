/**
 * 答疑模块 API
 * 后端 baseURL: /pc/qna（已与其他模块统一为 /pc 前缀）
 */
import { fetchConfig } from '~/composables/useHttp'

// 直接在统一 baseURL 后拼 /qna，覆盖全部环境：
//   SSR:        http://localhost:8081/pc        + /qna = http://localhost:8081/pc/qna（直连后端）
//   本地客户端:  /api                            + /qna = /api/qna →（dev 代理 /api→/pc）→ /pc/qna
//   线上客户端:  http://43.242.200.25:8081/pc    + /qna = http://43.242.200.25:8081/pc/qna（直连后端）
const QNA_BASE = `${fetchConfig.baseURL}/qna`;

// 与 course.js 的 getAuthHeaders 完全一致：localStorage 优先，useCookie 兜底
const qnaHeaders = () => {
  let tokenValue = '';
  if (process.client) {
    tokenValue = localStorage.getItem('token') || localStorage.getItem('Token') || '';
    if (!tokenValue) {
      try { tokenValue = useCookie('token').value || ''; } catch {}
    }
  }
  return {
    Authorization: tokenValue ? `Bearer ${tokenValue}` : '',
    token: tokenValue,
    appid: fetchConfig.headers.appid,
  };
};

// 统一 $fetch 封装，带完整 headers
const qnaFetch = (url, options = {}) => {
  return $fetch(url, {
    ...options,
    headers: {
      ...qnaHeaders(),
      ...(options.headers || {}),
    },
  });
};

/** 获取标签列表 GET /pc/qna/tag/search */
export async function apiGetQnaTags(type = '') {
  return qnaFetch(`${QNA_BASE}/tag/search`, {
    params: type ? { type } : {},
  });
}

/** 问题列表 POST /pc/qna/question/list */
export async function apiGetQuestionList({ resourceNo, resourceType, type, keyword, pageNum = 1, pageSize = 10 } = {}) {
  return qnaFetch(`${QNA_BASE}/question/list`, {
    method: 'POST',
    body: {
      resourceNo: resourceNo || undefined,
      resourceType: resourceType || undefined,
      type: type || undefined,
      keyword: keyword || undefined,
      pageNum,
      pageSize,
    },
  });
}

/** 问题详情 POST /pc/qna/question/detail */
export async function apiGetQuestionDetail(questionId) {
  return qnaFetch(`${QNA_BASE}/question/detail`, {
    method: 'POST',
    body: { questionId },
  });
}

/** 新增问题（保存草稿）POST /pc/qna/question/create */
export async function apiCreateQuestion(data) {
  return qnaFetch(`${QNA_BASE}/question/create`, {
    method: 'POST',
    body: data,
  });
}

/** 发布问题 POST /pc/qna/question/publish */
export async function apiPublishQuestion(questionId) {
  return qnaFetch(`${QNA_BASE}/question/publish`, {
    method: 'POST',
    body: { questionId },
  });
}

/** 编辑问题 POST /pc/qna/question/my/draft/edit */
export async function apiEditQuestion(data) {
  return qnaFetch(`${QNA_BASE}/question/my/draft/edit`, {
    method: 'POST',
    body: data,
  });
}

/** 删除问题 POST /pc/qna/question/delete */
export async function apiDeleteQuestion(questionId) {
  // questionId 可能是雪花ID大数字，转成字符串传给后端
  return qnaFetch(`${QNA_BASE}/question/delete`, {
    method: 'POST',
    body: { questionId: String(questionId) },
  });
}

/** 关注问题 POST /pc/qna/question/follow */
export async function apiFollowQuestion(questionId) {
  return qnaFetch(`${QNA_BASE}/question/follow`, {
    method: 'POST',
    body: { questionId },
  });
}

/** 取消关注 POST /pc/qna/question/follow/cancel */
export async function apiCancelFollowQuestion(questionId) {
  return qnaFetch(`${QNA_BASE}/question/follow/cancel`, {
    method: 'POST',
    body: { questionId },
  });
}

/** 提交回答 POST /pc/qna/answer/createPost */
export async function apiSubmitAnswer(questionId, content) {
  return qnaFetch(`${QNA_BASE}/answer/createPost`, {
    method: 'POST',
    body: { questionId: String(questionId), content },
  });
}

/** 采纳回答 POST /pc/qna/question/solve */
export async function apiSolveQuestion(questionId, answerId) {
  return qnaFetch(`${QNA_BASE}/question/solve`, {
    method: 'POST',
    body: { questionId, answerId },
  });
}

/** 取消采纳 POST /pc/qna/question/cancel/solve */
export async function apiCancelSolve(questionId, answerId) {
  return qnaFetch(`${QNA_BASE}/question/cancel/solve`, {
    method: 'POST',
    body: { questionId, answerId },
  });
}

/** 给回答点赞 POST /pc/qna/answer/vote */
export async function apiVoteAnswer(answerId) {
  return qnaFetch(`${QNA_BASE}/answer/vote`, {
    method: 'POST',
    body: { answerId },
  });
}

/** 取消点赞 POST /pc/qna/answer/vote/cancel */
export async function apiCancelVoteAnswer(answerId) {
  return qnaFetch(`${QNA_BASE}/answer/vote/cancel`, {
    method: 'POST',
    body: { answerId },
  });
}

/** 我的草稿 GET /pc/qna/question/my/draft */
export async function apiGetMyDraft() {
  return qnaFetch(`${QNA_BASE}/question/my/draft`);
}
