import type { MessageCatalog } from "../types.js";

export const ru: MessageCatalog = {
  "welcome.title": "💫 Добро пожаловать в Soulthread",
  "welcome.body":
    "ИИ-спутники с памятью и голосом.\nВыберите персонажа — чат здесь или Mini App.",
  "welcome.howHeader": "Как это работает:",
  "welcome.how1": "💬 Выберите компаньона и общайтесь по-своему",
  "welcome.how2": "🧠 Многоуровневая память — они помнят вас",
  "welcome.how3": "🎙️ Голос и полный Free Chat в Mini App",
  "welcome.how4": "✨ Создавайте · исследуйте · подписывайтесь",
  "welcome.web": "🌐 {{url}}",
  "welcome.channel": "📢 Официальный канал: {{url}}",
  "welcome.group": "👥 Официальная группа: {{url}}",
  "welcome.custom": "🎨 Кастомный персонаж: {{url}}",
  "welcome.aff":
    "Партнёрская ссылка применена: aff={{affCode}}\nОткройте Mini App или начните чат — регистрация может быть атрибутирована партнёру.",
  "welcome.source": "Источник: {{source}}",
  "welcome.openedWith": "(Открыто с: {{raw}})",
  "welcome.picksHeader": "Подборка на сегодня:",
  "welcome.picksFooter":
    "Нажмите «Выбрать персонажа» или Открыть Soulthread для полного списка.",

  "agent.meet": "Знакомьтесь: {{name}}",
  "agent.introFallback": "Откройте Mini App, чтобы познакомиться с этим спутником.",
  "agent.cta":
    "Нажмите «Быстрый чат здесь» для короткого Free Chat в Telegram,\nили откройте Mini App для памяти, голоса и сообщества.",
  "agent.fallbackName": "Спутник Soulthread",

  "companion.default": "спутник",
  "companion.a": "спутник",

  "kb.openApp": "Открыть Soulthread",
  "kb.pickCharacter": "Выбрать персонажа",
  "kb.language": "🌐 Язык",
  "kb.browseAll": "Смотреть всех в App",
  "kb.quickChat": "Быстрый чат здесь",
  "kb.fullChat": "Полный чат в App",
  "kb.voicePreview": "Слушать голос (превью)",
  "kb.moreCharacters": "Ещё персонажи",
  "kb.continueInApp": "Продолжить в App",
  "kb.endChat": "Завершить чат",
  "kb.switchCharacter": "Сменить персонажа",
  "kb.openFull": "Открыть полный опыт",
  "kb.keepChatting": "Продолжить здесь",
  "kb.end": "Стоп",
  "kb.subscribe": "Подписаться",
  "kb.softUpsellLater": "Позже",
  "kb.endSupport": "Завершить поддержку",
  "kb.openSupportBot": "Открыть бота поддержки",
  "kb.channel": "📢 Официальный канал",
  "kb.group": "👥 Официальная группа",
  "kb.customCharacter": "🎨 Кастомный персонаж",

  "help.body": [
    "Soulthread Bot",
    "",
    "/start — Приветствие + открыть Mini App",
    "/app — Открыть Soulthread Mini App",
    "/characters — Популярные персонажи",
    "/chat — Начать быстрый чат (или /chat <roleId>)",
    "/support — Связаться с поддержкой",
    "/end — Завершить быстрый чат или поддержку",
    "/language — Сменить язык",
    "/bind — Как Telegram связан с веб-аккаунтом",
    "/vip — Купить VIP, бонус-пакеты или Soul (карта или крипта)",
    "/invite — Пригласить друзей за очки",
    "/rewards — Забрать ежедневные награды",
    "/affiliate — Заявка на партнёрский аккаунт",
    "/help — Это сообщение",
    "",
    "Также можно отправить: Язык / English / 简体中文 / 繁體中文 / Español / Русский",
  ].join("\n"),

  "app.body":
    "Откройте Soulthread для полного опыта Free Chat.\n\nЕсли кнопка Mini App не открывается, используйте эту ссылку:\n{{url}}",

  "characters.empty":
    "Сейчас не удалось загрузить персонажей. Откройте Mini App, чтобы изучить всё сообщество.",
  "characters.header": "Популярные персонажи",
  "characters.footer": "Нажмите портрет, чтобы начать, или смотрите всех в App.",

  "chat.pickToStart": "Выберите персонажа для быстрого чата:",
  "chat.active":
    "Вы общаетесь с {{name}}. Отправьте сообщение или /characters для смены.",
  "chat.endNone": "Нет активного быстрого чата. /characters чтобы начать.",
  "chat.ended":
    "Быстрый чат с {{name}} завершён. Откройте Mini App в любое время для полного опыта.",
  "chat.endedShort": "Быстрый чат с {{name}} завершён.",
  "chat.noActiveContinue": "Нет активного чата. Сначала выберите персонажа.",
  "chat.listening": "Скажите что-нибудь — я слушаю.",
  "chat.beginTitle": "Быстрый чат с {{name}}.",
  "chat.beginHint": "Пишите в любое время. Введите /end чтобы остановить.",
  "chat.beginCap": "Дневной лимит быстрого чата бота: {{max}} ходов.",
  "chat.beginMiniApp": "Память, голос, поиск и создание → Mini App.",
  "chat.beginFailed":
    "Сейчас не удалось начать быстрый чат. Откройте Mini App для полного опыта.",
  "chat.turnFooter": "—\n{{quota}} · ход {{turn}}",
  "chat.hardStop":
    "Дневной лимит быстрого чата достигнут. Продолжите в Mini App.",
  "chat.nudge":
    "Нравится? Полная память, голос и сообщество — в Mini App.",
  "chat.softUpsell":
    "Хотите пойти чуть глубже?\n\nБесплатный вкус на этом заканчивается. С подпиской диалог становится ближе и напряжённее — меньше сдержанности, больше атмосферы, которая принадлежит только вам двоим.",

  "support.defaultName": "Поддержка Soulthread",
  "support.notConfigured":
    "Для поддержки нужен OPENROUTER_API_KEY (или SUPPORT_LLM_API_KEY) в .env бота. Попросите оператора настроить или откройте Mini App.",
  "support.llmFailed":
    "Ответ поддержки не удался ({{detail}}). Попробуйте позже.",
  "support.active":
    "Вы в поддержке с {{name}}. Меню ниже или просто напишите вопрос.",
  "support.beginTitle": "Чат поддержки с {{name}}.",
  "support.beginHint":
    "Спрашивайте про VIP, Soul Coin, очки, оплату и как пользоваться Soulthread. Меню ниже или просто напишите вопрос.",
  "support.beginCap": "Дневной лимит бота (общий): {{max}} ходов.",
  "support.beginFailed":
    "Не удалось начать поддержку сейчас. Попробуйте позже или откройте Mini App.",
  "support.ended": "Поддержка с {{name}} завершена.",
  "support.endedShort": "Поддержка с {{name}} завершена.",
  "support.turnFooter": "—\nподдержка ход {{turn}}",
  "support.thinking": "Отвечаю…",
  "support.hardStop":
    "Дневной лимит достигнут. Откройте Mini App или вернитесь завтра.",
  "support.goToBot":
    "Поддержка теперь в @{{username}}. Нажмите ниже, чтобы открыть бота поддержки.",
  "support.helpBody":
    "Это официальная поддержка Soulthread. Меню ниже или просто напишите вопрос.",
  "support.menuRecharge": "Как пополнить",
  "support.menuSoul": "Очки и Soul Coin",
  "support.menuFeedback": "Нужна помощь? Оставьте отзыв",
  "support.rechargeGuide":
    "Пополнение в боте: карта (Stripe) или крипта (USDT).\nВыберите тариф ниже, затем Карта или Крипто.\n\nКарта: завершите Stripe Checkout в браузере (Visa / Mastercard / Link).\n\nКрипто: валюта всегда USDT. На странице оплаты выберите Ethereum, Tron или BNB Chain (BSC) — не Solana и не другую монету. Неверная сеть или адрес могут не зачислиться.\nКак платить криптой:\n1. Откройте ссылку и выберите сеть USDT, как в кошельке (ETH / TRX / BSC)\n2. Откройте свой кошелёк и нажмите «Отправить»\n3. Выберите сеть, где лежит этот USDT (должна совпадать со страницей оплаты)\n4. Вставьте адрес со страницы оплаты и отправьте ровно указанную сумму\nМожно также отсканировать QR кошельком на телефоне.\n\nЗачисление может занять время. Мы не просим seed-фразы, ключи и полный номер карты.",
  "support.rechargeStepChoose":
    "① Откройте страницу оплаты и выберите USDT в сети Ethereum, Tron или BNB Chain. Не выбирайте Solana и другие монеты.",
  "support.rechargeStepWallet":
    "② Откройте свой кошелёк и нажмите «Отправить»",
  "support.rechargeStepNetwork":
    "③ Нажмите All networks и выберите сеть, где лежит ваш USDT (должна совпадать со страницей: ETH / TRX / BSC)",
  "support.rechargeStepPay":
    "④ Вставьте адрес отправки со страницы оплаты. Можно также отсканировать QR кошельком на телефоне. Отправьте ровно указанную сумму.",
  "support.soulExplain":
    "Soul Coin — это ваши очки.\n\nДарите их любимым Agent или живым аватарам, чтобы повысить симпатию. Высокая симпатия открывает другой контент и диалоги.\n\nSoul Coin также можно тратить на генерацию картинок и видео для любимых Agent.\n\nПополнить можно в этом боте картой (Stripe) или криптой (USDT, сеть Ethereum / Tron / BNB Chain).",
  "support.feedbackPrompt":
    "Напишите вопрос или отзыв обычным сообщением — отвечу здесь.",

  "quota.unlimited": "Квота: без лимита",
  "quota.left": "Осталось квоты ≈ {{count}}",
  "quota.unknown": "Квота: —",

  "err.emptyMessage": "Отправьте текстовое сообщение для чата.",
  "err.pickCharacter": "Сначала выберите персонажа через /characters или /chat.",
  "err.dailyCap":
    "Вы достигли дневного лимита быстрого чата ({{max}}). Продолжите в Mini App для полного Free Chat, памяти и голоса.",
  "err.noAuth":
    "Не удалось начать чат (auth). Откройте Mini App, чтобы продолжить, или попробуйте позже.",
  "err.quota":
    "Хотите пойти чуть глубже?\n\nБесплатные диалоги на сегодня закончились. С подпиской больше свободы в общении — и разговор становится ближе и напряжённее: меньше сдержанности, больше атмосферы, которая принадлежит только вам двоим.",
  "err.emptyReply":
    "Пустой ответ. Откройте Mini App, чтобы продолжить разговор.",
  "err.api":
    "Чат временно недоступен ({{detail}}). Откройте Soulthread Mini App, чтобы продолжить — сообщение не потеряется, если повторите там.",
  "err.generating": "Персонаж ещё отвечает. Подождите пару секунд и отправьте снова.",

  "bind.title": "Связать Telegram ↔ Soulthread Web",
  "bind.configured":
    "Когда вы быстро общаетесь здесь, мы создаём (или используем) аккаунт Soulthread, привязанный к вашему Telegram ID. Открытие Mini App из этого бота входит с той же Telegram-личностью — память может продолжаться.",
  "bind.notConfigured":
    "Auth Bot API ещё не настроен. Откройте Mini App после включения Telegram Login на сервере.",
  "bind.emailSteps":
    "Привяжите реальный email в Mini App → Настройки → Привязать email (код подтверждения). Вход через Telegram / Apple останется тем же аккаунтом.\nЕсли этот email уже занят другим аккаунтом Soulthread, привязка не сработает — войдите в исходный аккаунт. Автослияния нет.",

  "rateLimit":
    "Вы отправляете сообщения слишком быстро. Подождите немного или откройте Mini App для полного опыта.",

  "voice.disabled":
    "Превью голоса отключено. Откройте Mini App для полного TTS.",
  "voice.caption": "Превью голоса · полный выразительный TTS в Mini App",
  "voice.failed":
    "Не удалось воспроизвести превью. Откройте Mini App, чтобы услышать голоса.",

  "lang.prompt": "Выберите язык / Choose your language",
  "lang.current": "Сейчас: {{language}}",
  "lang.hint": "Нажмите кнопку или отправьте: English · 简体中文 · 繁體中文 · Español · Русский",
  "lang.changed": "✅ Язык изменён на {{language}}",
  "lang.changedHint": "Можно снова сменить через /language",
  "lang.menuSynced": "Описания меню / в этом чате обновлены — снова введите /, чтобы увидеть.",

  "cmd.start": "Приветствие и открыть Mini App",
  "cmd.app": "Открыть Soulthread Mini App",
  "cmd.characters": "Популярные персонажи",
  "cmd.chat": "Начать / продолжить быстрый чат",
  "cmd.support": "Чат поддержки",
  "cmd.end": "Завершить чат / поддержку",
  "cmd.language": "Сменить язык",
  "cmd.bind": "Telegram ↔ веб-аккаунт",
  "cmd.vip": "Купить VIP / пакеты / Soul",
  "cmd.invite": "Пригласить друзей за очки",
  "cmd.rewards": "Забрать ежедневные награды",
  "cmd.affiliate": "Заявка на партнёрский аккаунт",
  "cmd.help": "Команды и deep links",
  "cmd.supportRecharge": "Как пополнить",
  "cmd.supportSoul": "Очки и Soul Coin",
  "cmd.supportFeedback": "Нужна помощь? Оставить отзыв",

  "vip.disabled":
    "Оплата в боте пока не включена. Откройте Mini App, чтобы оформить подписку на сайте.",
  "vip.authFailed":
    "Не удалось проверить Telegram-аккаунт. Откройте Mini App и снова введите /vip.",
  "vip.loadFailed": "Не удалось загрузить тарифы. Попробуйте позже.",
  "vip.empty":
    "Нет доступных VIP, бонус-пакетов или Soul Coin. Попробуйте позже или Mini App.",
  "vip.header":
    "VIP, бонус-пакеты и Soul Coin Soulthread\nОплата картой (Stripe) или криптой (USDT).\nПакеты квот — только картой.\nКарта: Visa / Mastercard / Link.\nКрипто: Ethereum, Tron или BNB Chain — выбираете на странице оплаты.",
  "vip.sectionVip": "—— VIP-подписки ——",
  "vip.premiumTitle": "PREMIUM",
  "vip.premiumBody":
    "Безлимитный чат · Полный режим · Постоянная память\nМодель без ограничений · Фото агента · Живой звонок\nСообщество · Поощрения авторам",
  "vip.ultimateTitle": "ULTIMATE",
  "vip.ultimateBody": "Всё из PREMIUM\nСюжетный режим · Больше голосовой квоты",
  "vip.durMonth": "мес.",
  "vip.durYear": "год",
  "vip.sectionOneTime": "—— Разовые товары ——",
  "vip.quotaChatDetail": "Сразу получите {{n}} квоты на чат",
  "vip.quotaVoiceDetail": "Сразу получите {{n}} голосовой квоты",
  "vip.quotaRepeat": "Можно покупать снова — квота начисляется сразу. Только карта.",
  "vip.quotaCardOnly": "Только оплата картой.",
  "vip.welfareDetail":
    "Один месяц PREMIUM VIP + Soul в подарок. Повторная покупка продлевает VIP и копит Soul.",
  "vip.promoPrice": "{{charge}} · -{{pct}}% (было {{list}})",
  "vip.wasPrice": "было {{price}}",
  "vip.sectionSoul": "—— Soul Coin ——",
  "vip.soulCatalog":
    "{{rate}} Soul = $1. Для предметов, глав и магазина.\nМин. ${{min}}, целыми долларами. Купленный Soul нельзя вывести.\nНажмите «Купить Soul Coin» ниже, чтобы выбрать сумму.",
  "vip.footerPick": "Нажмите кнопку ниже, чтобы заказать.",
  "vip.alreadyActive": "У вас уже есть активный VIP. Управляйте им в Mini App.",
  "vip.checkoutFailed": "Не удалось создать заказ. Попробуйте снова или откройте Mini App.",
  "vip.cryptoMinAmount":
    "Слишком маленькая сумма для крипто. Увеличьте сумму или откройте Mini App.",
  "vip.invoiceFailed":
    "Не удалось открыть ссылку оплаты. Попробуйте снова или оплатите в Mini App.",
  "vip.invoiceDesc": "Soulthread · {{name}}",
  "vip.payLink":
    "Оплатите {{name}} в USDT (ETH / TRX / BSC).\nСеть выбираете на странице оплаты. После оплаты VIP/Soul активируются автоматически.",
  "vip.payButton": "Оплатить криптой",
  "vip.choosePay": "Оплата {{name}}\nВыберите способ:",
  "vip.payButtonStripe": "💳 Карта (Stripe)",
  "vip.payButtonCrypto": "🪙 Крипто (USDT)",
  "vip.stripePayLink":
    "Оплатите {{name}} картой (Stripe).\nЗавершите оплату в браузере. VIP, квота или Soul активируются автоматически.",
  "vip.stripePayButton": "Оплатить картой",
  "vip.payExpired": "Сессия оплаты истекла. Начните снова с /vip.",
  "vip.preCheckoutBad": "Неверный заказ. Начните снова с /vip.",
  "vip.paidVip":
    "✅ Оплата получена. VIP активен — откройте Mini App для полного опыта.",
  "vip.paidPoints":
    "✅ Оплата получена. Soul зачислены — откройте Mini App, чтобы использовать.",
  "vip.paidConfirmFailed":
    "Оплата прошла, но активация не удалась ({{detail}}). Напишите в поддержку с этим чатом.",
  "vip.soulButton": "🪙 Купить Soul Coin",
  "vip.soulHeader":
    "Купить Soul Coin\nМин. ${{min}} · шаг ${{step}} (целые $)\nКурс: {{rate}} Soul = $1\nВыберите сумму, затем карта или крипто.",
  "vip.soulCustomButton": "✏️ Своя сумма",
  "vip.soulBack": "« Назад",
  "vip.soulAskAmount":
    "Отправьте сумму в целых долларах (мин. ${{min}}, шаг ${{step}}).\nПримеры: 15 · 20 · $30",
  "vip.soulInvalidAmount":
    "Неверная сумма. Целые доллары ≥ ${{min}} (напр. 15, 20, 30).",
  "vip.soulUnavailable": "Soul Coin сейчас недоступен. Позже или Mini App.",
  "vip.soulCancel": "Отмена",
  "vip.soulPayLabel": "{{soul}} Soul · ${{usd}}",
  "vip.choosePayStripeOnly": "Оплата {{name}}\nЭтот товар только картой.",
  "vip.stripeOnly": "Этот товар только картой. Выберите карту или откройте Mini App.",

  "invite.authFailed":
    "Не удалось проверить Telegram-аккаунт. Откройте Mini App и снова введите /invite.",
  "invite.loadFailed": "Не удалось загрузить приглашения. Попробуйте позже.",
  "invite.header": "🎁 Пригласи друзей · получи очки",
  "invite.rewardLine":
    "Друзья: {{invitee}} очк. при регистрации · Вы: {{inviter}} очк. за успешное приглашение.",
  "invite.codeLabel": "Ваш код: {{code}}",
  "invite.linkLabel": "Ваша ссылка:",
  "invite.stats": "Успешных приглашений: {{total}} · Заработано очков: {{earned}}",
  "invite.activityEnded": "⚠️ Кампания приглашений сейчас не активна.",
  "invite.listHeader": "Ваши приглашения ({{total}}):",
  "invite.listEmpty": "Пока нет приглашений — поделитесь ссылкой.",
  "invite.listItem": "{{n}}. {{email}} · {{status}} · {{date}}",
  "invite.listMore": "Показано {{shown}} из {{total}} — полный список в Mini App.",
  "invite.statusCompleted": "завершено",
  "invite.statusPending": "ожидание",
  "invite.statusUnknown": "неизвестно",
  "invite.openApp": "Открыть страницу приглашений",

  "rewards.authFailed":
    "Не удалось проверить Telegram-аккаунт. Откройте Mini App и снова введите /rewards.",
  "rewards.loadFailed": "Не удалось загрузить ежедневные задания. Попробуйте позже.",
  "rewards.header": "🎁 Ежедневные награды · заберите бонусы",
  "rewards.systemDisabled": "Ежедневные задания временно недоступны.",
  "rewards.activity": "Активность сегодня: {{current}} / {{max}}",
  "rewards.milestones": "Вехи: {{list}}",
  "rewards.listHeader": "Задания сегодня ({{total}}):",
  "rewards.listEmpty": "Сегодня заданий нет.",
  "rewards.listItem": "{{n}}. {{title}} · {{status}} · +{{points}} очк.{{progress}}",
  "rewards.statusClaimable": "можно забрать",
  "rewards.statusClaimed": "забрано",
  "rewards.statusInProgress": "в процессе",
  "rewards.statusExpired": "истекло",
  "rewards.hintClaim": "{{count}} наград(ы) готовы — нажмите кнопку ниже.",
  "rewards.hintComplete":
    "Выполните задания в Mini App, затем вернитесь (или нажмите Обновить), чтобы забрать.",
  "rewards.btnClaimTask": "Забрать · {{title}}",
  "rewards.btnCheckIn": "Чекин · {{title}}",
  "rewards.btnDoTask": "Сделать · {{title}}",
  "rewards.btnClaimMilestone": "Активность {{threshold}} · +{{points}}",
  "rewards.btnRefresh": "🔄 Обновить",
  "rewards.openApp": "Открыть Mini App",
  "rewards.claimSuccess": "✅ +{{points}} очк. · баланс {{balance}}",
  "rewards.claimFailed": "Не удалось забрать. Попробуйте снова или откройте Mini App.",
  "rewards.claimFailedDetail":
    "Не удалось забрать ({{detail}}). Попробуйте снова или откройте Mini App.",
  "rewards.openLink": "Откройте ссылку, чтобы выполнить задание:\n{{url}}",
  "rewards.ackDone": "Отмечено выполненным — заберите, когда статус станет «можно забрать».",

  "affiliate.body":
    "Хотите стать партнёром Soulthread?\n\nДва формата:\n• Likeness Agent — агент с вашим образом + рефералка\n• Channel RevShare — доля с VIP-выручки канала\n\nНажмите кнопку, чтобы открыть форму. Подробнее: {{detailsUrl}}",
  "affiliate.applyButton": "Открыть форму заявки",
  "affiliate.detailsButton": "Условия программы",
};
