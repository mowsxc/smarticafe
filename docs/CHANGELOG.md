# Changelog

## Unreleased

- 收银台统一协同：收银台永远展示“当前实时班次”（云端 `shifts(status=active)` + `shift_live`），所有登录用户进入收银台看到同一实时数据。
- 权限硬限制：仅超管(admin)与当班人员（active shift employee）可编辑收银台；其它角色只读但实时订阅回显。
- 防止协同视角漂移：收紧班次信息编辑入口（仅超管可改），避免本地切换日期/班次/员工导致各看各的。
