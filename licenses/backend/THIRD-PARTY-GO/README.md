# Go 第三方许可材料（待最终镜像复核）

本目录整理空库版 linux/arm64、CGO_ENABLED=0 的 API、Worker 和初始化器 `go list -deps` 实际依赖的 Go 模块（109 个 arm64 共用模块，另含 1 个 amd64 专属模块）许可证、NOTICE 及专利声明。版本、Go 校验和与文件位置见 `MODULES.tsv`；模块原始许可文本未修改。Go 运行时的 LICENSE 与 PATENTS 在 `go-runtime/`。

`github.com/go-sql-driver/mysql v1.8.1` 为 MPL-2.0，源码包 `source/go-sql-driver-mysql-v1.8.1.zip` 的 Go `h1` 内容校验和已与依赖清单核对一致；该组件源码与用户自有闭源服务源码独立。源码和 MPL 原文不得省略。

本清单依据 2026-11-04 的私有 ARM64 与 AMD64 交叉编译测试快照和 Go 1.26.0 本机分析；构建器 Go 1.26.10 的 LICENSE/PATENTS 已与本材料哈希比对一致。正式镜像可能因代码、架构、构建标志、标签或依赖发生变化，必须对最终产物 `go version -m`、go.sum 重新核对并补齐相关许可证。模块根文本及所用包路径的上级目录线索并非完整法律审查，不覆盖基础镜像、CA、时区、其他内嵌数据或网络加载组件。
