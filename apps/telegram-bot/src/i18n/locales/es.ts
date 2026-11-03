import type { MessageCatalog } from "../types.js";

export const es: MessageCatalog = {
  "welcome.title": "💫 Bienvenido a Soulthread",
  "welcome.body":
    "Compañeros de IA con memoria y voz.\nElige un personaje — chatea aquí o abre la Mini App.",
  "welcome.howHeader": "Cómo funciona:",
  "welcome.how1": "💬 Elige un compañero y habla a tu manera",
  "welcome.how2": "🧠 Memoria en capas — te recuerdan",
  "welcome.how3": "🎙️ Voz y Free Chat completo en Mini App",
  "welcome.how4": "✨ Crear · explorar · seguir personajes",
  "welcome.web": "🌐 {{url}}",
  "welcome.channel": "📢 Canal oficial: {{url}}",
  "welcome.group": "👥 Grupo oficial: {{url}}",
  "welcome.custom": "🎨 Personaje a medida: {{url}}",
  "welcome.aff":
    "Enlace de socio aplicado: aff={{affCode}}\nAbre la Mini App o empieza a chatear — tu registro puede atribuirse a este socio.",
  "welcome.source": "Fuente: {{source}}",
  "welcome.openedWith": "(Abierto con: {{raw}})",
  "welcome.picksHeader": "Selección de hoy:",
  "welcome.picksFooter":
    "Toca «Elegir un personaje» o Abre Soulthread para ver la lista completa.",

  "agent.meet": "Conoce a {{name}}",
  "agent.introFallback": "Abre la Mini App para conocer a este compañero.",
  "agent.cta":
    "Toca «Chat rápido aquí» para un Free Chat corto en Telegram,\no abre la Mini App para memoria, voz y comunidad.",
  "agent.fallbackName": "Compañero Soulthread",

  "companion.default": "compañero",
  "companion.a": "un compañero",

  "kb.openApp": "Abrir Soulthread",
  "kb.pickCharacter": "Elegir un personaje",
  "kb.language": "🌐 Idioma",
  "kb.browseAll": "Ver todos en la App",
  "kb.quickChat": "Chat rápido aquí",
  "kb.fullChat": "Chat completo en la App",
  "kb.voicePreview": "Oír voz (vista previa)",
  "kb.moreCharacters": "Más personajes",
  "kb.continueInApp": "Continuar en la App",
  "kb.endChat": "Terminar chat",
  "kb.switchCharacter": "Cambiar personaje",
  "kb.openFull": "Abrir experiencia completa",
  "kb.keepChatting": "Seguir chateando aquí",
  "kb.end": "Fin",
  "kb.subscribe": "Suscribirse",
  "kb.softUpsellLater": "Ahora no",
  "kb.endSupport": "Terminar soporte",
  "kb.openSupportBot": "Abrir bot de soporte",
  "kb.channel": "📢 Canal oficial",
  "kb.group": "👥 Grupo oficial",
  "kb.customCharacter": "🎨 Personaje a medida",

  "help.body": [
    "Soulthread Bot",
    "",
    "/start — Bienvenida + Abrir Mini App",
    "/app — Abrir Soulthread Mini App",
    "/characters — Compañeros destacados",
    "/chat — Iniciar chat rápido (o /chat <roleId>)",
    "/support — Hablar con soporte",
    "/end — Terminar chat rápido o soporte",
    "/language — Cambiar idioma",
    "/bind — Cómo se vincula Telegram con la Web",
    "/vip — Comprar VIP, packs de oferta o Soul (tarjeta o cripto)",
    "/invite — Invitar amigos por puntos",
    "/rewards — Reclamar recompensas diarias",
    "/affiliate — Solicitar cuenta de afiliado",
    "/help — Este mensaje",
    "",
    "También puedes enviar: Idioma / English / 简体中文 / 繁體中文 / Español / Русский",
  ].join("\n"),

  "app.body":
    "Abre Soulthread para la experiencia Free Chat completa.\n\nSi el botón de Mini App no abre, usa este enlace:\n{{url}}",

  "characters.empty":
    "No se pudieron cargar personajes ahora. Abre la Mini App para explorar toda la comunidad.",
  "characters.header": "Compañeros destacados",
  "characters.footer": "Toca el retrato para empezar, o explora todos en la App.",

  "chat.pickToStart": "Elige un personaje para el chat rápido:",
  "chat.active":
    "Estás chateando con {{name}}. Envía un mensaje, o /characters para cambiar.",
  "chat.endNone": "No hay chat rápido activo. /characters para empezar uno.",
  "chat.ended":
    "Terminaste el chat rápido con {{name}}. Abre la Mini App cuando quieras la experiencia completa.",
  "chat.endedShort": "Terminaste el chat rápido con {{name}}.",
  "chat.noActiveContinue": "No hay chat activo. Elige un personaje primero.",
  "chat.listening": "Di algo — te escucho.",
  "chat.beginTitle": "Chat rápido con {{name}}.",
  "chat.beginHint": "Envía un mensaje cuando quieras. Escribe /end para parar.",
  "chat.beginCap": "Límite diario de chat rápido del bot: {{max}} turnos.",
  "chat.beginMiniApp": "Memoria, voz, explorar y crear → Mini App.",
  "chat.beginFailed":
    "No se pudo iniciar el chat rápido ahora. Abre la Mini App para la experiencia completa.",
  "chat.turnFooter": "—\n{{quota}} · turno {{turn}}",
  "chat.hardStop":
    "Alcanzaste el límite diario de chat rápido. Continúa en la Mini App.",
  "chat.nudge":
    "¿Te gusta? Memoria completa, voz y comunidad están en la Mini App.",
  "chat.softUpsell":
    "¿Quieres ir un poco más profundo?\n\nAquí termina la prueba gratuita. Con la membresía, la charla se vuelve más cercana y con más tensión: menos reserva, más de esa atmósfera que es solo de ustedes.",

  "support.defaultName": "Soporte Soulthread",
  "support.notConfigured":
    "El soporte necesita OPENROUTER_API_KEY (o SUPPORT_LLM_API_KEY) en el .env del bot. Pide al operador que lo configure, o abre la Mini App.",
  "support.llmFailed":
    "Falló la respuesta de soporte ({{detail}}). Inténtalo más tarde.",
  "support.active":
    "Estás en soporte con {{name}}. Usa el menú de abajo, o envía una pregunta.",
  "support.beginTitle": "Chat de soporte con {{name}}.",
  "support.beginHint":
    "Pregunta por VIP, Soul Coin, puntos, pagos o cómo usar Soulthread. Usa el menú, o envía una pregunta.",
  "support.beginCap": "Límite diario del bot (compartido): {{max}} turnos.",
  "support.beginFailed":
    "No se pudo iniciar el soporte ahora. Inténtalo más tarde o abre la Mini App.",
  "support.ended": "Terminaste el soporte con {{name}}.",
  "support.endedShort": "Soporte con {{name}} terminado.",
  "support.turnFooter": "—\nsoporte turno {{turn}}",
  "support.thinking": "Respondiendo…",
  "support.hardStop":
    "Límite diario alcanzado. Abre la Mini App o vuelve mañana.",
  "support.goToBot":
    "El soporte ahora está en @{{username}}. Toca abajo para hablar con el bot de soporte.",
  "support.helpBody":
    "Este es el soporte oficial de Soulthread. Usa el menú o envía una pregunta.",
  "support.menuRecharge": "Cómo recargar",
  "support.menuSoul": "Puntos y Soul Coin",
  "support.menuFeedback": "¿Más ayuda? Envía tu comentario",
  "support.rechargeGuide":
    "Recargas en el bot: tarjeta (Stripe) o cripto (USDT).\nElige un plan abajo y luego Tarjeta o Cripto.\n\nTarjeta: completa el checkout de Stripe en el navegador (Visa / Mastercard / Link).\n\nCripto: la moneda es siempre USDT. En la página de pago elige Ethereum, Tron o BNB Chain (BSC), no Solana ni otra moneda. Otra red o dirección puede no acreditarse.\nCómo pagar con cripto:\n1. Abre el enlace y elige la red USDT de tu wallet (ETH / TRX / BSC)\n2. Abre tu propia wallet y toca Enviar\n3. Elige la cadena donde está ese USDT (debe coincidir con la página de pago)\n4. Pega la dirección de la página y envía exactamente el importe mostrado\nTambién puedes escanear el código QR con la wallet del móvil.\n\nEl crédito puede tardar un poco. Nunca pedimos seed phrases, claves privadas ni el número completo de la tarjeta.",
  "support.rechargeStepChoose":
    "① Abre la página de pago y elige USDT en Ethereum, Tron o BNB Chain. No elijas Solana ni otras monedas.",
  "support.rechargeStepWallet":
    "② Abre tu propia wallet y toca Enviar",
  "support.rechargeStepNetwork":
    "③ Toca All networks y elige la cadena donde está tu USDT (debe coincidir con la página: ETH / TRX / BSC)",
  "support.rechargeStepPay":
    "④ Pega la dirección de envío de la página de pago. También puedes escanear el QR con la wallet del móvil. Envía exactamente el importe mostrado.",
  "support.soulExplain":
    "Soul Coin son tus puntos.\n\nRegálalos a Agents o avatares reales que te gusten para subir la afinidad. Más afinidad desbloquea contenidos y conversaciones distintas.\n\nTambién puedes gastar Soul Coin para generar imágenes o vídeos de los Agents que te gusten.\n\nRecarga en este bot con tarjeta (Stripe) o cripto (USDT en Ethereum, Tron o BNB Chain).",
  "support.feedbackPrompt":
    "Envía tu pregunta o comentario como un mensaje normal. Responderé aquí.",

  "quota.unlimited": "Cuota: ilimitada",
  "quota.left": "Cuota restante ≈ {{count}}",
  "quota.unknown": "Cuota: —",

  "err.emptyMessage": "Envía un mensaje de texto para chatear.",
  "err.pickCharacter": "Elige un personaje primero con /characters o /chat.",
  "err.dailyCap":
    "Alcanzaste el límite de chat rápido de hoy ({{max}}). Continúa en la Mini App para Free Chat completo, memoria y voz.",
  "err.noAuth":
    "No se pudo iniciar el chat (auth). Abre la Mini App para continuar, o inténtalo más tarde.",
  "err.quota":
    "¿Quieres ir un poco más profundo?\n\nLos chats gratis de hoy llegan hasta aquí. Con la membresía tienes más margen para hablar, y la conversación se vuelve más cercana y con más tensión: menos reserva, más de esa atmósfera que es solo de ustedes.",
  "err.emptyReply":
    "Respuesta vacía. Abre la Mini App para continuar la conversación.",
  "err.api":
    "El chat no está disponible temporalmente ({{detail}}). Abre Soulthread Mini App para continuar — tu mensaje no se pierde si reintentas allí.",
  "err.generating": "El personaje sigue respondiendo. Espera unos segundos y vuelve a enviar.",

  "bind.title": "Vincular Telegram ↔ Soulthread Web",
  "bind.configured":
    "Cuando chateas aquí, creamos (o reutilizamos) una cuenta Soulthread ligada a tu ID de Telegram. Abrir la Mini App desde este bot inicia sesión con la misma identidad de Telegram — la memoria puede continuar.",
  "bind.notConfigured":
    "La auth de Bot API aún no está configurada. Abre la Mini App cuando Telegram Login esté habilitado en el servidor.",
  "bind.emailSteps":
    "Puedes vincular un email real en Mini App → Ajustes → Vincular email (código de verificación). Luego Telegram / Apple siguen en la misma cuenta.\nSi ese email ya pertenece a otra cuenta de Soulthread, el vínculo fallará; usa la cuenta original. No hay fusión automática.",

  "rateLimit":
    "Estás enviando mensajes demasiado rápido. Espera un momento, o abre la Mini App para la experiencia completa.",

  "voice.disabled":
    "La vista previa de voz está desactivada. Abre la Mini App para TTS completo.",
  "voice.caption": "Vista previa de voz · TTS expresivo completo en la Mini App",
  "voice.failed":
    "Falló la vista previa de voz. Abre la Mini App para oír a los compañeros.",

  "lang.prompt": "Elige tu idioma / Choose your language",
  "lang.current": "Actual: {{language}}",
  "lang.hint": "Toca un botón, o envía: English · 简体中文 · 繁體中文 · Español · Русский",
  "lang.changed": "✅ Idioma cambiado a {{language}}",
  "lang.changedHint": "Puedes cambiarlo cuando quieras con /language",
  "lang.menuSynced": "Las descripciones del menú / de este chat ya están actualizadas — escribe / para verlas.",

  "cmd.start": "Bienvenida y abrir Mini App",
  "cmd.app": "Abrir Soulthread Mini App",
  "cmd.characters": "Compañeros destacados",
  "cmd.chat": "Iniciar / reanudar chat rápido",
  "cmd.support": "Chat de soporte",
  "cmd.end": "Terminar chat / soporte",
  "cmd.language": "Cambiar idioma",
  "cmd.bind": "Info Telegram ↔ cuenta Web",
  "cmd.vip": "Comprar VIP / packs / Soul",
  "cmd.invite": "Invitar amigos por puntos",
  "cmd.rewards": "Reclamar recompensas diarias",
  "cmd.affiliate": "Solicitar cuenta de afiliado",
  "cmd.help": "Comandos y deep links",
  "cmd.supportRecharge": "Cómo recargar",
  "cmd.supportSoul": "Puntos y Soul Coin",
  "cmd.supportFeedback": "¿Más ayuda? Enviar comentario",

  "vip.disabled":
    "Los pagos en el bot aún no están activos. Abre la Mini App para suscribirte en la web.",
  "vip.authFailed":
    "No se pudo verificar tu cuenta de Telegram. Abre la Mini App y vuelve a intentar /vip.",
  "vip.loadFailed": "No se pudieron cargar los planes. Inténtalo más tarde.",
  "vip.empty":
    "No hay VIP, packs de oferta o Soul Coin ahora. Prueba más tarde o la Mini App.",
  "vip.header":
    "VIP, packs de oferta y Soul Coin de Soulthread\nPaga con tarjeta (Stripe) o cripto (USDT).\nLos packs de cuota son solo con tarjeta.\nTarjeta: Visa / Mastercard / Link.\nCripto: Ethereum, Tron o BNB Chain — la eliges en la página de pago.",
  "vip.sectionVip": "—— Suscripciones VIP ——",
  "vip.premiumTitle": "PREMIUM",
  "vip.premiumBody":
    "Cuota de chat ilimitada · Modo completo · Memoria permanente\nModelo sin restricciones · Fotos del agente · Llamada en vivo\nComunidad · Incentivos para creadores",
  "vip.ultimateTitle": "ULTIMATE",
  "vip.ultimateBody": "Todo lo de PREMIUM\nModo historia · Más cuota de voz",
  "vip.durMonth": "mes",
  "vip.durYear": "año",
  "vip.sectionOneTime": "—— Artículos de una sola compra ——",
  "vip.quotaChatDetail": "Obtén al instante {{n}} de cuota de chat",
  "vip.quotaVoiceDetail": "Obtén al instante {{n}} de cuota de voz",
  "vip.quotaRepeat": "Puedes volver a comprar: la cuota se suma al instante. Solo tarjeta.",
  "vip.quotaCardOnly": "Solo pago con tarjeta.",
  "vip.welfareDetail":
    "Un mes de PREMIUM VIP + Soul de regalo. Al repetir se alarga el VIP y se acumula Soul.",
  "vip.promoPrice": "{{charge}} · -{{pct}}% (antes {{list}})",
  "vip.wasPrice": "antes {{price}}",
  "vip.sectionSoul": "—— Soul Coin ——",
  "vip.soulCatalog":
    "{{rate}} Soul = $1. Para objetos, desbloquear capítulos y la tienda.\nMín. ${{min}}, en dólares enteros. El Soul comprado no se puede retirar.\nPulsa «Comprar Soul Coin» abajo para elegir el monto.",
  "vip.footerPick": "Pulsa un botón abajo para pedir.",
  "vip.alreadyActive": "Ya tienes VIP activo. Gestiona la suscripción en la Mini App.",
  "vip.checkoutFailed": "No se pudo crear el pedido. Reintenta o abre la Mini App.",
  "vip.cryptoMinAmount":
    "El monto cripto es demasiado bajo. Sube el monto o abre la Mini App.",
  "vip.invoiceFailed":
    "No se pudo abrir el enlace de pago. Reintenta o paga en la Mini App.",
  "vip.invoiceDesc": "Soulthread · {{name}}",
  "vip.payLink":
    "Paga {{name}} con USDT (ETH / TRX / BSC).\nElige la red en la página de pago. Tras completar el pago, VIP/Soul se activan solos.",
  "vip.payButton": "Pagar con cripto",
  "vip.choosePay": "Pagar {{name}}\nElige un método:",
  "vip.payButtonStripe": "💳 Tarjeta (Stripe)",
  "vip.payButtonCrypto": "🪙 Cripto (USDT)",
  "vip.stripePayLink":
    "Paga {{name}} con tarjeta (Stripe).\nCompleta el checkout en el navegador. VIP, cuota o Soul se activan solos tras el pago.",
  "vip.stripePayButton": "Pagar con tarjeta",
  "vip.payExpired": "Este pago expiró. Empieza de nuevo con /vip.",
  "vip.preCheckoutBad": "Pedido inválido. Empieza de nuevo con /vip.",
  "vip.paidVip":
    "✅ Pago recibido. Tu VIP está activo — abre la Mini App para la experiencia completa.",
  "vip.paidPoints":
    "✅ Pago recibido. Los Soul ya están en tu cuenta — ábrelos en la Mini App.",
  "vip.paidConfirmFailed":
    "Se cobró el pago, pero falló la activación ({{detail}}). Contacta soporte con este chat.",
  "vip.soulButton": "🪙 Comprar Soul Coin",
  "vip.soulHeader":
    "Comprar Soul Coin\nMín. ${{min}} · paso ${{step}} (dólares enteros)\nTasa: {{rate}} Soul = $1\nElige un monto y paga con tarjeta o cripto.",
  "vip.soulCustomButton": "✏️ Monto personalizado",
  "vip.soulBack": "« Atrás",
  "vip.soulAskAmount":
    "Envía el monto en dólares enteros (mín. ${{min}}, paso ${{step}}).\nEj.: 15 · 20 · $30",
  "vip.soulInvalidAmount":
    "Monto inválido. Usa dólares enteros ≥ ${{min}} (p. ej. 15, 20, 30).",
  "vip.soulUnavailable": "Soul Coin no disponible ahora. Más tarde o Mini App.",
  "vip.soulCancel": "Cancelar",
  "vip.soulPayLabel": "{{soul}} Soul · ${{usd}}",
  "vip.choosePayStripeOnly": "Pagar {{name}}\nEste artículo solo admite tarjeta.",
  "vip.stripeOnly": "Este artículo solo admite tarjeta. Elige tarjeta o abre la Mini App.",

  "invite.authFailed":
    "No se pudo verificar tu cuenta de Telegram. Abre la Mini App y vuelve a intentar /invite.",
  "invite.loadFailed": "No se pudo cargar la info de invitaciones. Inténtalo más tarde.",
  "invite.header": "🎁 Invita amigos · gana puntos",
  "invite.rewardLine":
    "Amigos: {{invitee}} pts al registrarse · Tú: {{inviter}} pts por invitación exitosa.",
  "invite.codeLabel": "Tu código: {{code}}",
  "invite.linkLabel": "Tu enlace de invitación:",
  "invite.stats": "Invitaciones exitosas: {{total}} · Puntos ganados: {{earned}}",
  "invite.activityEnded": "⚠️ Esta campaña de invitaciones no está activa ahora.",
  "invite.listHeader": "Tus invitaciones ({{total}}):",
  "invite.listEmpty": "Aún no hay invitaciones — comparte tu enlace.",
  "invite.listItem": "{{n}}. {{email}} · {{status}} · {{date}}",
  "invite.listMore": "Mostrando {{shown}} de {{total}} — abre Mini App para la lista completa.",
  "invite.statusCompleted": "completada",
  "invite.statusPending": "pendiente",
  "invite.statusUnknown": "desconocido",
  "invite.openApp": "Abrir página de invitaciones",

  "rewards.authFailed":
    "No se pudo verificar tu cuenta de Telegram. Abre la Mini App y vuelve a intentar /rewards.",
  "rewards.loadFailed": "No se pudieron cargar las tareas diarias. Inténtalo más tarde.",
  "rewards.header": "🎁 Recompensas diarias · reclama beneficios",
  "rewards.systemDisabled": "Las tareas diarias no están disponibles temporalmente.",
  "rewards.activity": "Actividad de hoy: {{current}} / {{max}}",
  "rewards.milestones": "Hitos: {{list}}",
  "rewards.listHeader": "Tareas de hoy ({{total}}):",
  "rewards.listEmpty": "No hay tareas hoy.",
  "rewards.listItem": "{{n}}. {{title}} · {{status}} · +{{points}} pts{{progress}}",
  "rewards.statusClaimable": "reclamable",
  "rewards.statusClaimed": "reclamada",
  "rewards.statusInProgress": "en curso",
  "rewards.statusExpired": "expirada",
  "rewards.hintClaim": "{{count}} recompensa(s) lista(s) — toca un botón abajo.",
  "rewards.hintComplete":
    "Completa tareas en la Mini App y vuelve (o toca Actualizar) para reclamar.",
  "rewards.btnClaimTask": "Reclamar · {{title}}",
  "rewards.btnCheckIn": "Check-in · {{title}}",
  "rewards.btnDoTask": "Hacer · {{title}}",
  "rewards.btnClaimMilestone": "Actividad {{threshold}} · +{{points}}",
  "rewards.btnRefresh": "🔄 Actualizar",
  "rewards.openApp": "Abrir Mini App",
  "rewards.claimSuccess": "✅ +{{points}} pts · saldo {{balance}}",
  "rewards.claimFailed": "No se pudo reclamar. Reintenta o abre la Mini App.",
  "rewards.claimFailedDetail": "No se pudo reclamar ({{detail}}). Reintenta o abre la Mini App.",
  "rewards.openLink": "Abre este enlace para completar la tarea:\n{{url}}",
  "rewards.ackDone": "Marcada como hecha — reclama cuando pase a «reclamable».",

  "affiliate.body":
    "¿Quieres asociarte con Soulthread?\n\nDos modelos:\n• Likeness Agent — agente con tu imagen + referidos\n• Channel RevShare — comisión por tráfico VIP\n\nPulsa el botón para abrir el formulario. Detalles: {{detailsUrl}}",
  "affiliate.applyButton": "Abrir formulario",
  "affiliate.detailsButton": "Detalles del programa",
};
