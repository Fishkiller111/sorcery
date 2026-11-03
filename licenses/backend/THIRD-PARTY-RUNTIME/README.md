# 运行时第三方素材与源码（待最终镜像逐字节复核）

本目录针对候选方案：`scratch` 最终镜像中仅复制 Alpine 3.23 资源阶段产出的 CA 证书包和时区数据；资源阶段的操作系统、包管理器和工具不应被复制到最终层。此处为 2026-11-04 资源阶段已观察版本。最终构建必须重新核对实际资源版本、证书和 zoneinfo 的字节、镜像各层，版本变化则本材料不自动适用。

资源阶段回执：CA 文件 SHA-256 为 `5961c0a3c65459931c023e0075c09733f09aea4ca439cb85bc4a08bb4f3f568b`；zoneinfo 共 603 个普通文件，按路径与文件 SHA-256 生成清单的聚合 SHA-256 为 `7af6d866e38692a16e79d055db4f63c1bc455887e3a8a8024a44f7d50edb49d6`（不含权限位）。这是私有资源阶段结果，不是最终镜像校验。

## CA 证书

Alpine `ca-certificates-bundle 20261020-r0`：项目声明 `MPL-2.0 AND MIT`，证书数据来自 Mozilla NSS。完整对应发行源码 `source/ca-certificates-20261020.tar.bz2` 含 `certdata.txt` 和构建脚本，SHA-512 已对照 Alpine 对应版本 APKBUILD；MPL 与 MIT 文本见 `licenses/`。源码包中的 `mk-ca-bundle.pl` 标识为 curl 许可，附上 `licenses/curl.txt`；同时保留 GPL-2.0-or-later 文本用于源码包可能涉及的脚本复核，不表示这些脚本被复制到最终运行镜像。

- 包版本与声明：https://pkgs.alpinelinux.org/package/v3.23/main/aarch64/ca-certificates-bundle
- 对应构建脚本与源码校验：https://raw.githubusercontent.com/alpinelinux/aports/ac857c298f6fd212498ce76bb87836d940cdba2d/main/ca-certificates/APKBUILD
- MPL 2.0：https://www.mozilla.org/en-US/MPL/2.0/

## 时区数据

Alpine `tzdata 2026e-r0` 声明 Public-Domain；`source/tzdata2026e.tar.gz` 与 `source/tzcode2026e.tar.gz` 的 SHA-512 均已对照对应 Alpine APKBUILD。该发行物的不同源码文件可能另有 BSD 条款，按实际分发内容保留对应许可，不能笼统推断全部相关工具均为公共领域。

- 包版本与声明：https://pkgs.alpinelinux.org/package/v3.23/main/aarch64/tzdata
- 对应构建脚本与源码校验：https://raw.githubusercontent.com/alpinelinux/aports/b1038ae4c377e83afa1be2989437b14ba9101838/main/tzdata/APKBUILD
- IANA 发行源：https://data.iana.org/time-zones/releases/

CA、时区源文件及对应许可要与镜像一起可获得；此记录不覆盖 Go 模块、镜像剩余文件或用户自有软件。尚未验证最终镜像是否只包含上述文件，亦不构成完整法律意见。若改用旧版 Alpine 运行层，BusyBox、apk-tools 等 GPL 组件及其精确对应源码另需处理，本目录不能替代其合规材料。
