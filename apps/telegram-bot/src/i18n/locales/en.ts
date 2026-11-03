import type { MessageCatalog } from "../types.js";

export const en: MessageCatalog = {
  "welcome.title": "💫 Welcome to Soulthread",
  "welcome.body": "AI companions with memory & voice.\nPick a character — chat here or open the Mini App.",
  "welcome.howHeader": "How it works:",
  "welcome.how1": "💬 Pick a companion and talk your way",
  "welcome.how2": "🧠 Layered memory — they remember you",
  "welcome.how3": "🎙️ Voice & full Free Chat in Mini App",
  "welcome.how4": "✨ Create · explore · follow characters",
  "welcome.web": "🌐 {{url}}",
  "welcome.channel": "📢 Official channel: {{url}}",
  "welcome.group": "👥 Official group: {{url}}",
  "welcome.custom": "🎨 Custom character: {{url}}",
  "welcome.aff":
    "Partner link applied: aff={{affCode}}\nOpen the Mini App or start chatting — your signup can attribute to this partner.",
  "welcome.source": "Source: {{source}}",
  "welcome.openedWith": "(Opened with: {{raw}})",
  "welcome.picksHeader": "Today's picks:",
  "welcome.picksFooter": "Tap «Pick a character» or Open Soulthread for the full list.",

  "agent.meet": "Meet {{name}}",
  "agent.introFallback": "Open the Mini App to meet this companion.",
  "agent.cta":
    "Tap «Quick chat here» for a short Free Chat in Telegram,\nor open the Mini App for memory, voice, and community.",
  "agent.fallbackName": "Soulthread companion",

  "companion.default": "companion",
  "companion.a": "a companion",

  "kb.openApp": "Open Soulthread",
  "kb.pickCharacter": "Pick a character",
  "kb.language": "🌐 Language",
  "kb.browseAll": "Browse all in App",
  "kb.quickChat": "Quick chat here",
  "kb.fullChat": "Full chat in App",
  "kb.voicePreview": "Hear voice (preview)",
  "kb.moreCharacters": "More characters",
  "kb.continueInApp": "Continue in App",
  "kb.endChat": "End chat",
  "kb.switchCharacter": "Switch character",
  "kb.openFull": "Open full experience",
  "kb.keepChatting": "Keep chatting here",
  "kb.end": "End",
  "kb.subscribe": "Subscribe",
  "kb.softUpsellLater": "Not now",
  "kb.endSupport": "End support",
  "kb.openSupportBot": "Open support bot",
  "kb.channel": "📢 Official channel",
  "kb.group": "👥 Official group",
  "kb.customCharacter": "🎨 Custom character",

  "help.body": [
    "Soulthread Bot",
    "",
    "/start — Welcome + Open Mini App",
    "/app — Open Soulthread Mini App",
    "/characters — Hot companions",
    "/chat — Start quick chat (or /chat <roleId>)",
    "/support — Talk to customer support",
    "/end — End quick chat or support",
    "/language — Change language",
    "/bind — How Telegram links to Web",
    "/vip — Buy VIP, welfare packs, or Soul Coin (card or crypto)",
    "/invite — Invite friends for points",
    "/rewards — Claim daily rewards",
    "/affiliate — Apply to become an affiliate partner",
    "/help — This message",
    "",
    "You can also send: Language / English / 简体中文 / 繁體中文 / Español / Русский",
  ].join("\n"),

  "app.body":
    "Open Soulthread for the full Free Chat experience.\n\nIf the Mini App button does not open, use this link:\n{{url}}",

  "characters.empty":
    "Could not load characters right now. Open the Mini App to explore the full community.",
  "characters.header": "Hot companions",
  "characters.footer": "Tap a portrait to start, or browse all in the App.",

  "chat.pickToStart": "Pick a character to quick-chat:",
  "chat.active":
    "You're chatting with {{name}}. Send a message, or /characters to switch.",
  "chat.endNone": "No active quick chat. /characters to start one.",
  "chat.ended":
    "Ended quick chat with {{name}}. Open the Mini App anytime for the full experience.",
  "chat.endedShort": "Ended quick chat with {{name}}.",
  "chat.noActiveContinue": "No active chat. Pick a character first.",
  "chat.listening": "Say something — I'm listening.",
  "chat.beginTitle": "Quick chat with {{name}}.",
  "chat.beginHint": "Send a message anytime. Type /end to stop.",
  "chat.beginCap": "Bot daily quick-chat cap: {{max}} turns.",
  "chat.beginMiniApp": "Memory, voice, explore & create → Mini App.",
  "chat.beginFailed":
    "Could not start quick chat right now. Open the Mini App for the full experience.",
  "chat.turnFooter": "—\n{{quota}} · turn {{turn}}",
  "chat.hardStop": "Daily quick-chat cap reached. Continue in the Mini App.",
  "chat.nudge": "Loving this? Full memory, voice & community are in the Mini App.",
  "chat.softUpsell":
    "Want to go a little deeper?\n\nThat's the end of the free taste. With a membership, conversations lean closer and carry more charge—less reserved, more of the atmosphere that feels like yours alone.",

  "support.defaultName": "Soulthread Support",
  "support.notConfigured":
    "Customer support needs OPENROUTER_API_KEY (or SUPPORT_LLM_API_KEY) in the bot .env. Ask the operator to configure it, or open the Mini App.",
  "support.llmFailed":
    "Support reply failed ({{detail}}). Please try again later.",
  "support.active":
    "You're in support with {{name}}. Use the menu below, or send a question.",
  "support.beginTitle": "Support chat with {{name}}.",
  "support.beginHint":
    "Ask about VIP, Soul Coin, points, payments, or how to use Soulthread. Use the menu below, or send a question.",
  "support.beginCap": "Bot daily chat cap (shared): {{max}} turns.",
  "support.beginFailed":
    "Could not start support chat right now. Please try again later or open the Mini App.",
  "support.ended": "Ended support chat with {{name}}.",
  "support.endedShort": "Ended support with {{name}}.",
  "support.turnFooter": "—\nsupport turn {{turn}}",
  "support.thinking": "Replying…",
  "support.hardStop":
    "Daily chat cap reached. Open the Mini App or come back tomorrow for more support.",
  "support.goToBot":
    "Customer support is now @{{username}}. Tap below to start chatting with the support bot.",
  "support.helpBody":
    "This is Soulthread customer support. Use the menu below, or send a question anytime.",
  "support.menuRecharge": "How to recharge",
  "support.menuSoul": "Points & Soul Coin",
  "support.menuFeedback": "Need more help? Send feedback",
  "support.rechargeGuide":
    "Bot top-ups: card (Stripe) or crypto (USDT).\nPick a plan below, then choose Card or Crypto.\n\nCard: complete Stripe checkout in the browser (Visa / Mastercard / Link).\n\nCrypto: currency is always USDT. On the payment page pick Ethereum, Tron, or BNB Chain (BSC) — not Solana or any other coin. Wrong chain or address may never credit.\nHow to pay crypto:\n1. Open the payment link and choose the USDT network that matches your wallet (ETH / TRX / BSC)\n2. Open your own wallet and tap Send\n3. Select the chain where that USDT lives (must match the payment page)\n4. Paste the payment-page address and send the exact amount shown\nYou can also scan the QR code with a mobile wallet for a faster pay.\n\nCredit may take a short while. We never ask for seed phrases, private keys, or full card numbers.",
  "support.rechargeStepChoose":
    "① Open the payment page and pick USDT on Ethereum, Tron, or BNB Chain. Do not pick Solana or other coins.",
  "support.rechargeStepWallet":
    "② Open your own wallet and tap Send",
  "support.rechargeStepNetwork":
    "③ Tap All networks and choose the chain where your USDT is (must match the payment page: ETH / TRX / BSC)",
  "support.rechargeStepPay":
    "④ Paste the send address from the payment page. You can also scan the QR code with a mobile wallet. Send the exact amount shown.",
  "support.soulExplain":
    "Soul Coin is your points.\n\nGift them to Agents or real-person avatars you like to raise affinity. Higher affinity unlocks different content and conversations.\n\nYou can also spend Soul Coin to generate images or videos for Agents you like.\n\nTop up in this bot with card (Stripe) or crypto (USDT on Ethereum, Tron, or BNB Chain).",
  "support.feedbackPrompt":
    "Send your question or feedback as a normal message. I'll reply here.",

  "quota.unlimited": "Quota: unlimited",
  "quota.left": "Quota left ≈ {{count}}",
  "quota.unknown": "Quota: —",

  "err.emptyMessage": "Send a text message to chat.",
  "err.pickCharacter": "Pick a character first with /characters or /chat.",
  "err.dailyCap":
    "You've reached today's quick-chat limit ({{max}}). Continue in the Mini App for full Free Chat, memory, and voice.",
  "err.noAuth":
    "Could not start chat (auth). Open the Mini App to continue, or try again later.",
  "err.quota":
    "Want to go a little deeper?\n\nToday's free chats have come to a close. With a membership, you get more room to talk—and conversations that lean closer, with more charge: less reserved, more of the atmosphere that feels like yours alone.",
  "err.emptyReply": "Got an empty reply. Open the Mini App to continue the conversation.",
  "err.api":
    "Chat is temporarily unavailable ({{detail}}). Open Soulthread Mini App to continue — your message was not lost on our side if you retry there.",
  "err.generating": "The character is still replying. Wait a few seconds and send again.",

  "bind.title": "Link Telegram ↔ Soulthread Web",
  "bind.configured":
    "When you quick-chat here, we create (or reuse) a Soulthread account tied to your Telegram ID. Opening the Mini App from this bot signs you in with the same Telegram identity — memory can continue.",
  "bind.notConfigured":
    "Bot API auth is not configured yet. Open the Mini App after Telegram Login is enabled on the server.",
  "bind.emailSteps":
    "You can bind a real email in Mini App Settings → Bind email (verification code). Telegram / Apple sign-in afterwards stays on the same account.\nIf that email already belongs to another Soulthread account, binding will fail — use the original account. Accounts are not merged automatically.",

  "rateLimit":
    "You're sending messages too quickly. Please wait a moment, or open the Mini App for the full experience.",

  "voice.disabled": "Voice preview is disabled. Open the Mini App for full TTS.",
  "voice.caption": "Voice preview · full expressive TTS in the Mini App",
  "voice.failed": "Voice preview failed. Open the Mini App to hear companions.",

  "lang.prompt": "Choose your language / 选择语言 / 選擇語言 / Elige idioma / Выберите язык",
  "lang.current": "Current: {{language}}",
  "lang.hint": "Tap a button below, or send: English · 简体中文 · 繁體中文 · Español · Русский",
  "lang.changed": "✅ Language set to {{language}}",
  "lang.changedHint": "You can change it anytime with /language",
  "lang.menuSynced": "Slash-menu descriptions are updated for this chat — type / to see them.",

  "cmd.start": "Welcome & Open Mini App",
  "cmd.app": "Open Soulthread Mini App",
  "cmd.characters": "Hot companions",
  "cmd.chat": "Start / resume quick chat",
  "cmd.support": "Customer support chat",
  "cmd.end": "End quick chat / support",
  "cmd.language": "Change language",
  "cmd.bind": "Telegram ↔ Web account info",
  "cmd.vip": "Buy VIP / packs / Soul Coin",
  "cmd.invite": "Invite friends for points",
  "cmd.rewards": "Claim daily rewards",
  "cmd.affiliate": "Apply to become an affiliate",
  "cmd.help": "Commands & deep links",
  "cmd.supportRecharge": "How to recharge",
  "cmd.supportSoul": "Points & Soul Coin",
  "cmd.supportFeedback": "Need more help? Send feedback",

  "vip.disabled":
    "In-bot payments are not enabled yet. Open the Mini App to subscribe on the web.",
  "vip.authFailed":
    "Could not verify your Telegram account. Open the Mini App, then try /vip again.",
  "vip.loadFailed": "Could not load plans right now. Please try again later.",
  "vip.empty":
    "No VIP, welfare packs, or Soul Coin available right now. Try the Mini App.",
  "vip.header":
    "Soulthread VIP, welfare packs & Soul Coin\nPay by card (Stripe) or crypto (USDT).\nQuota packs are card-only.\nCard: Visa / Mastercard / Link.\nCrypto: Ethereum, Tron, or BNB Chain — you choose on the payment page.",
  "vip.sectionVip": "—— VIP subscriptions ——",
  "vip.premiumTitle": "PREMIUM",
  "vip.premiumBody":
    "Unlimited chat quota · Full mode · Permanent memory\nUnrestricted model · Request agent photos · Live voice call\nCommunity system · Creator incentives",
  "vip.ultimateTitle": "ULTIMATE",
  "vip.ultimateBody": "Everything in PREMIUM\nStory mode · Higher voice quota",
  "vip.durMonth": "mo",
  "vip.durYear": "yr",
  "vip.sectionOneTime": "—— One-time items ——",
  "vip.quotaChatDetail": "Instantly get {{n}} chat quota",
  "vip.quotaVoiceDetail": "Instantly get {{n}} voice quota",
  "vip.quotaRepeat": "Buy again anytime — quota is added immediately. Card only.",
  "vip.quotaCardOnly": "Card payment only.",
  "vip.welfareDetail":
    "One month of PREMIUM VIP plus bonus Soul. Buy again to extend VIP and stack Soul.",
  "vip.promoPrice": "{{charge}} · -{{pct}}% (was {{list}})",
  "vip.wasPrice": "was {{price}}",
  "vip.sectionSoul": "—— Soul Coin ——",
  "vip.soulCatalog":
    "{{rate}} Soul = $1. Use for items, chapter unlocks, and shop redemptions.\nMin ${{min}}, whole-dollar steps. Purchased Soul is not withdrawable.\nTap “Buy Soul Coin” below to pick an amount.",
  "vip.footerPick": "Tap a button below to order.",
  "vip.alreadyActive": "You already have an active VIP. Manage it in the Mini App.",
  "vip.checkoutFailed": "Could not create the order. Please try again or open the Mini App.",
  "vip.cryptoMinAmount":
    "Crypto amount is too low. Pick a higher amount, or open the Mini App.",
  "vip.invoiceFailed":
    "Could not open the payment link. Please try again, or pay in the Mini App.",
  "vip.invoiceDesc": "Soulthread · {{name}}",
  "vip.payLink":
    "Pay for {{name}} with USDT (ETH / TRX / BSC).\nPick the network on the payment page. After payment completes, VIP/Soul unlock automatically.",
  "vip.payButton": "Pay with crypto",
  "vip.choosePay": "Pay for {{name}}\nChoose a method:",
  "vip.payButtonStripe": "💳 Card (Stripe)",
  "vip.payButtonCrypto": "🪙 Crypto (USDT)",
  "vip.stripePayLink":
    "Pay for {{name}} by card (Stripe).\nComplete checkout in the browser. VIP, quota, or Soul unlock automatically after payment.",
  "vip.stripePayButton": "Pay with card",
  "vip.payExpired": "This checkout expired. Please start again with /vip.",
  "vip.preCheckoutBad": "Invalid order. Please start again with /vip.",
  "vip.paidVip":
    "✅ Payment received. Your VIP is active — open the Mini App for the full experience.",
  "vip.paidPoints":
    "✅ Payment received. Soul credits are on your account — open the Mini App to use them.",
  "vip.paidConfirmFailed":
    "Payment was taken, but activation failed ({{detail}}). Contact support with this chat — we will fix it.",
  "vip.soulButton": "🪙 Buy Soul Coin",
  "vip.soulHeader":
    "Buy Soul Coin\nMin ${{min}} · step ${{step}} (whole dollars)\nRate: {{rate}} Soul = $1\nPick an amount, then pay by card or crypto.",
  "vip.soulCustomButton": "✏️ Custom amount",
  "vip.soulBack": "« Back",
  "vip.soulAskAmount":
    "Send the USD amount as a whole number (min ${{min}}, step ${{step}}).\nExamples: 15 · 20 · $30",
  "vip.soulInvalidAmount":
    "Invalid amount. Use a whole-dollar value ≥ ${{min}} (e.g. 15, 20, 30).",
  "vip.soulUnavailable": "Soul Coin purchase is unavailable right now. Try again later or use the Mini App.",
  "vip.soulCancel": "Cancel",
  "vip.soulPayLabel": "{{soul}} Soul · ${{usd}}",
  "vip.choosePayStripeOnly": "Pay for {{name}}\nThis item is card-only.",
  "vip.stripeOnly": "This item is card-only. Choose card payment, or open the Mini App.",

  "invite.authFailed":
    "Could not verify your Telegram account. Open the Mini App, then try /invite again.",
  "invite.loadFailed": "Could not load invite info right now. Please try again later.",
  "invite.header": "🎁 Invite friends · earn points",
  "invite.rewardLine":
    "Friends get {{invitee}} pts on signup · you get {{inviter}} pts per successful invite.",
  "invite.codeLabel": "Your invite code: {{code}}",
  "invite.linkLabel": "Your invite link:",
  "invite.stats": "Successful invites: {{total}} · Points earned: {{earned}}",
  "invite.activityEnded": "⚠️ This invite campaign is not active right now.",
  "invite.listHeader": "Your invites ({{total}}):",
  "invite.listEmpty": "No invites yet — share your link to get started.",
  "invite.listItem": "{{n}}. {{email}} · {{status}} · {{date}}",
  "invite.listMore": "Showing {{shown}} of {{total}} — open Mini App for the full list.",
  "invite.statusCompleted": "completed",
  "invite.statusPending": "pending",
  "invite.statusUnknown": "unknown",
  "invite.openApp": "Open invite page",

  "rewards.authFailed":
    "Could not verify your Telegram account. Open the Mini App, then try /rewards again.",
  "rewards.loadFailed": "Could not load daily tasks right now. Please try again later.",
  "rewards.header": "🎁 Daily rewards · claim benefits",
  "rewards.systemDisabled": "Daily tasks are temporarily unavailable.",
  "rewards.activity": "Today's activity: {{current}} / {{max}}",
  "rewards.milestones": "Milestones: {{list}}",
  "rewards.listHeader": "Today's tasks ({{total}}):",
  "rewards.listEmpty": "No tasks available today.",
  "rewards.listItem": "{{n}}. {{title}} · {{status}} · +{{points}} pts{{progress}}",
  "rewards.statusClaimable": "claimable",
  "rewards.statusClaimed": "claimed",
  "rewards.statusInProgress": "in progress",
  "rewards.statusExpired": "expired",
  "rewards.hintClaim": "{{count}} reward(s) ready — tap a button below to claim.",
  "rewards.hintComplete":
    "Complete tasks in the Mini App, then come back here (or tap Refresh) to claim.",
  "rewards.btnClaimTask": "Claim · {{title}}",
  "rewards.btnCheckIn": "Check in · {{title}}",
  "rewards.btnDoTask": "Do · {{title}}",
  "rewards.btnClaimMilestone": "Activity {{threshold}} · +{{points}}",
  "rewards.btnRefresh": "🔄 Refresh",
  "rewards.openApp": "Open Mini App",
  "rewards.claimSuccess": "✅ +{{points}} pts claimed · balance {{balance}}",
  "rewards.claimFailed": "Could not claim this reward. Try again or open the Mini App.",
  "rewards.claimFailedDetail": "Could not claim ({{detail}}). Try again or open the Mini App.",
  "rewards.openLink": "Open this link to complete the task:\n{{url}}",
  "rewards.ackDone": "Marked as done — claim when the status becomes claimable.",

  "affiliate.body":
    "Want to partner with Soulthread?\n\nTwo cooperation models:\n• Likeness Agent onboarding — create/host a likeness Agent + referral share\n• Channel RevShare — publisher/channel share on VIP revenue\n\nTap the button below to open the application form. Details: {{detailsUrl}}",
  "affiliate.applyButton": "Open application form",
  "affiliate.detailsButton": "Program details",
};
