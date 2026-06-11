// 获取内部网站列表
export function useSiteInfoListApi(query = {}) {
    return useHttpPost("SiteInfoList", `/site/list`, {
        body: query,
    })
}

// 获取内部网站详情
export function useSiteInfoDetailApi(id) {
    return useHttpGet("SiteInfoDetail", `/site/${id}`, {
        $: true
    })
}

// 使用内部网站
export function useSiteUrlApi(id) {
    return useHttpPost("SiteInfoDetail", `/site/use/${id}`, {
        $: true
    })
}


// 获取内部网站详情
export function useGetSiteInfoByIdApi(id, needUrl = false) {
    return useHttpGet("SiteInfoDetail", `/site/${id}?needUrl=${needUrl}`, {
        $: true
    })
}


// 上传网站封面
export function useUploadSiteCoverApi(cover) {
    return useHttpPost("SiteInfoDetail", `/site/cover/upload`, {
        file: cover
    })
}

// 刷新检查所有网站
export function useSiteInfoRefreshAllApi() {
    return useHttpPost("SiteInfoRefreshAll", `/site/check-all`, {
        $: true
    })
}

// 刷新检查单个网站
export function useSiteInfoRefreshApi(siteId) {
    return useHttpPost("SiteInfoRefresh", `/site/check`, {
        $: true,
        body: [siteId]
    })
}

// 获取网站负责人列表
export function useSiteResponsibleListApi(siteId) {
    return useHttpGet("SiteResponsibleList", `/site/responsible/${siteId}`, {
        $: true
    })
}

// 新增网站负责人
export function useSiteResponsibleAddApi(body) {
    return useHttpPost("SiteResponsibleAdd", "/site/responsible", {
        $: true,
        body
    })
}

// 删除网站负责人
export function useSiteResponsibleDeleteApi(ids) {
    const idArray = Array.isArray(ids) ? ids : [ids]
    const idParams = idArray.join(',')
    return useHttp("SiteResponsibleDelete", `/site/responsible/${idParams}`, {
        $: true,
        method: "DELETE"
    })
}

// 新增内部网站
export function useSiteInfoAddApi(body) {
    return useHttpPost("SiteInfoAdd", "/site", {
        $: true,
        body
    })
}

// 修改内部网站
export function useSiteInfoUpdateApi(body) {
    return useHttp("SiteInfoUpdate", "/site", {
        $: true,
        method: "PUT",
        body
    })
}

// 删除内部网站
export function useSiteInfoDeleteApi(id) {
    return useHttp("SiteInfoDelete", `/site/${id}`, {
        $: true,
        method: "DELETE"
    })
}

// 获取所有标签列表
export function useSiteTagsAllApi() {
    return useHttpGet("SiteTagsAll", "/site/tags/all", {
        $: true
    })
}

// 获取所有标签及其使用次数
export function useSiteTagsListApi() {
    return useHttpGet("SiteTagsList", `/site/tags/list`, {
        $: true
    })
}

// 新增标签
export function useSiteTagAddApi(body) {
    return useHttpPost("SiteTagAdd", "/site/tags", {
        $: true,
        body
    })
}

// 修改标签
export function useSiteTagUpdateApi(body) {
    return useHttp("SiteTagUpdate", "/site/tags", {
        $: true,
        method: "PUT",
        body
    })
}

// 删除标签
export function useSiteTagDeleteApi(ids) {
    const idArray = Array.isArray(ids) ? ids : [ids]
    const idParams = idArray.join(',')
    return useHttp("SiteTagDelete", `/site/tags/${idParams}`, {
        $: true,
        method: "DELETE"
    })
}

// 获取网站的标签列表
export function useSiteTagsBySiteIdApi(siteId) {
    return useHttpGet("SiteTagsBySiteId", `/site/tags/${siteId}`, {
        $: true
    })
}

// 启动演示站点后端服务
export function useSiteDemoStartApi(id) {
    return request("SiteDemoStart", `/site/demo/start/${id}`, {
        method: "POST",
    })
}

// 检查演示站点后端服务状态
export function useSiteDemoCheckApi(id) {
    return request("SiteDemoCheck", `/site/demo/check/${id}`, {
        method: "POST",
    })
}

// 停止演示站点服务
export function useSiteDemoStopApi(id) {
    return request("SiteDemoStop", `/site/demo/stop/${id}`, {
        method: "POST",
    })
}

// 获取内部网站列表
export function useSiteResourceOptions() {
    return useHttpGet("SiteResourceOptionsList", `/site/resources/options`, {
        $: true
    })
}