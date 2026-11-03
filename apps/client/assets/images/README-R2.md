# 外部素材配置

部分图片不随源码发布。部署者需提供自身拥有分发权的素材，并在 `EXPO_PUBLIC_APP_STATIC_BASE` 设置自己的素材服务地址。

客户端通过 `src/utils/appStaticAssets.ts` 拼接素材路径。切勿将密钥放入客户端配置。所有图像、音频和角色素材发布前均须单独审查授权。
