/**
 * Send push notifications via Expo Push API.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

/**
 * Send push notifications to a list of Expo push tokens.
 * @param {string[]} tokens - Expo push token strings (ExponentPushToken[...])
 * @param {{ title: string, body: string, data?: object }} message
 * @returns {Promise<{ sent: number, failed: string[] }>}
 */
async function sendExpoPush(tokens, { title, body, data = {} }) {
  const unique = [...new Set(tokens)].filter(Boolean);
  if (unique.length === 0) return { sent: 0, failed: [] };

  const failed = [];
  let sent = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const messages = batch.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[push] Expo API error', res.status, result);
        batch.forEach((t) => failed.push(t));
        continue;
      }

      if (result.data) {
        const list = Array.isArray(result.data) ? result.data : [result.data];
        list.forEach((ticket, idx) => {
          if (ticket.status === 'ok') sent += 1;
          else if (ticket.status === 'error') {
            if (batch[idx]) failed.push(batch[idx]);
            console.error('[push] Expo ticket error', ticket.message || ticket.details);
          }
        });
      }
      if (result.errors && result.errors.length) {
        console.error('[push] Expo request errors', JSON.stringify(result.errors));
        batch.forEach((t) => failed.push(t));
      }
    } catch (err) {
      console.error('[push] send failed', err.message);
      batch.forEach((t) => failed.push(t));
    }
  }

  return { sent, failed };
}

module.exports = { sendExpoPush };
