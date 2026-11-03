export const LOCALE_CODES = ["en", "zh-Hans", "zh-Hant", "es", "ru"] as const;

export type LocaleCode = (typeof LOCALE_CODES)[number];

export type MessageParams = Record<string, string | number>;

/** Flat catalog — English is the source of truth for keys. */
export type MessageCatalog = {
  "welcome.title": string;
  "welcome.body": string;
  "welcome.howHeader": string;
  "welcome.how1": string;
  "welcome.how2": string;
  "welcome.how3": string;
  "welcome.how4": string;
  "welcome.web": string;
  "welcome.channel": string;
  "welcome.group": string;
  "welcome.custom": string;
  "welcome.aff": string;
  "welcome.source": string;
  "welcome.openedWith": string;
  "welcome.picksHeader": string;
  "welcome.picksFooter": string;

  "agent.meet": string;
  "agent.introFallback": string;
  "agent.cta": string;
  "agent.fallbackName": string;

  "companion.default": string;
  "companion.a": string;

  "kb.openApp": string;
  "kb.pickCharacter": string;
  "kb.language": string;
  "kb.browseAll": string;
  "kb.quickChat": string;
  "kb.fullChat": string;
  "kb.voicePreview": string;
  "kb.moreCharacters": string;
  "kb.continueInApp": string;
  "kb.endChat": string;
  "kb.switchCharacter": string;
  "kb.openFull": string;
  "kb.keepChatting": string;
  "kb.end": string;
  "kb.subscribe": string;
  "kb.softUpsellLater": string;
  "kb.endSupport": string;
  "kb.openSupportBot": string;
  "kb.channel": string;
  "kb.group": string;
  "kb.customCharacter": string;

  "help.body": string;

  "app.body": string;

  "characters.empty": string;
  "characters.header": string;
  "characters.footer": string;

  "chat.pickToStart": string;
  "chat.active": string;
  "chat.endNone": string;
  "chat.ended": string;
  "chat.endedShort": string;
  "chat.noActiveContinue": string;
  "chat.listening": string;
  "chat.beginTitle": string;
  "chat.beginHint": string;
  "chat.beginCap": string;
  "chat.beginMiniApp": string;
  "chat.beginFailed": string;
  "chat.turnFooter": string;
  "chat.hardStop": string;
  "chat.nudge": string;
  /** 免费用户本会话超过 10 轮软提醒（标题+正文） */
  "chat.softUpsell": string;

  "support.defaultName": string;
  "support.notConfigured": string;
  "support.llmFailed": string;
  "support.active": string;
  "support.beginTitle": string;
  "support.beginHint": string;
  "support.beginCap": string;
  "support.beginFailed": string;
  "support.ended": string;
  "support.endedShort": string;
  "support.turnFooter": string;
  "support.thinking": string;
  "support.hardStop": string;
  "support.goToBot": string;
  "support.helpBody": string;
  "support.menuRecharge": string;
  "support.menuSoul": string;
  "support.menuFeedback": string;
  "support.rechargeGuide": string;
  "support.rechargeStepChoose": string;
  "support.rechargeStepNetwork": string;
  "support.rechargeStepWallet": string;
  "support.rechargeStepPay": string;
  "support.soulExplain": string;
  "support.feedbackPrompt": string;

  "quota.unlimited": string;
  "quota.left": string;
  "quota.unknown": string;

  "err.emptyMessage": string;
  "err.pickCharacter": string;
  "err.dailyCap": string;
  "err.noAuth": string;
  "err.quota": string;
  "err.emptyReply": string;
  "err.api": string;
  "err.generating": string;

  "bind.title": string;
  "bind.configured": string;
  "bind.notConfigured": string;
  "bind.emailSteps": string;

  "rateLimit": string;

  "voice.disabled": string;
  "voice.caption": string;
  "voice.failed": string;

  "lang.prompt": string;
  "lang.current": string;
  "lang.hint": string;
  "lang.changed": string;
  "lang.changedHint": string;
  "lang.menuSynced": string;

  "cmd.start": string;
  "cmd.app": string;
  "cmd.characters": string;
  "cmd.chat": string;
  "cmd.support": string;
  "cmd.end": string;
  "cmd.language": string;
  "cmd.bind": string;
  "cmd.vip": string;
  "cmd.invite": string;
  "cmd.rewards": string;
  "cmd.affiliate": string;
  "cmd.help": string;
  "cmd.supportRecharge": string;
  "cmd.supportSoul": string;
  "cmd.supportFeedback": string;

  "vip.disabled": string;
  "vip.authFailed": string;
  "vip.loadFailed": string;
  "vip.empty": string;
  "vip.header": string;
  "vip.sectionVip": string;
  "vip.premiumTitle": string;
  "vip.premiumBody": string;
  "vip.ultimateTitle": string;
  "vip.ultimateBody": string;
  "vip.durMonth": string;
  "vip.durYear": string;
  "vip.sectionOneTime": string;
  "vip.quotaChatDetail": string;
  "vip.quotaVoiceDetail": string;
  "vip.quotaRepeat": string;
  "vip.quotaCardOnly": string;
  "vip.welfareDetail": string;
  "vip.promoPrice": string;
  "vip.wasPrice": string;
  "vip.sectionSoul": string;
  "vip.soulCatalog": string;
  "vip.footerPick": string;
  "vip.alreadyActive": string;
  "vip.checkoutFailed": string;
  "vip.cryptoMinAmount": string;
  "vip.invoiceFailed": string;
  "vip.invoiceDesc": string;
  "vip.payLink": string;
  "vip.payButton": string;
  "vip.choosePay": string;
  "vip.payButtonStripe": string;
  "vip.payButtonCrypto": string;
  "vip.stripePayLink": string;
  "vip.stripePayButton": string;
  "vip.payExpired": string;
  "vip.preCheckoutBad": string;
  "vip.paidVip": string;
  "vip.paidPoints": string;
  "vip.paidConfirmFailed": string;
  "vip.soulButton": string;
  "vip.soulHeader": string;
  "vip.soulCustomButton": string;
  "vip.soulBack": string;
  "vip.soulAskAmount": string;
  "vip.soulInvalidAmount": string;
  "vip.soulUnavailable": string;
  "vip.soulCancel": string;
  "vip.soulPayLabel": string;
  "vip.choosePayStripeOnly": string;
  "vip.stripeOnly": string;

  "invite.authFailed": string;
  "invite.loadFailed": string;
  "invite.header": string;
  "invite.rewardLine": string;
  "invite.codeLabel": string;
  "invite.linkLabel": string;
  "invite.stats": string;
  "invite.activityEnded": string;
  "invite.listHeader": string;
  "invite.listEmpty": string;
  "invite.listItem": string;
  "invite.listMore": string;
  "invite.statusCompleted": string;
  "invite.statusPending": string;
  "invite.statusUnknown": string;
  "invite.openApp": string;

  "rewards.authFailed": string;
  "rewards.loadFailed": string;
  "rewards.header": string;
  "rewards.systemDisabled": string;
  "rewards.activity": string;
  "rewards.milestones": string;
  "rewards.listHeader": string;
  "rewards.listEmpty": string;
  "rewards.listItem": string;
  "rewards.statusClaimable": string;
  "rewards.statusClaimed": string;
  "rewards.statusInProgress": string;
  "rewards.statusExpired": string;
  "rewards.hintClaim": string;
  "rewards.hintComplete": string;
  "rewards.btnClaimTask": string;
  "rewards.btnCheckIn": string;
  "rewards.btnDoTask": string;
  "rewards.btnClaimMilestone": string;
  "rewards.btnRefresh": string;
  "rewards.openApp": string;
  "rewards.claimSuccess": string;
  "rewards.claimFailed": string;
  "rewards.claimFailedDetail": string;
  "rewards.openLink": string;
  "rewards.ackDone": string;

  "affiliate.body": string;
  "affiliate.applyButton": string;
  "affiliate.detailsButton": string;
};

export type MessageKey = keyof MessageCatalog;

export type TranslateFn = (key: MessageKey, params?: MessageParams) => string;
