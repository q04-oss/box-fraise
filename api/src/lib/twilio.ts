import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;

export async function sendCreditSMS(params: {
  to: string;
  senderName: string;
  amountDollars: string;
  claimToken: string;
  note?: string;
}) {
  const { to, senderName, amountDollars, claimToken, note } = params;
  const claimUrl = `https://fraise.box/claim-credit/${claimToken}`;
  const noteText = note ? `\n\n"${note}"` : '';
  const body = `${senderName} sent you CA$${amountDollars} in Box Fraise credit 🍓${noteText}\n\nClaim it: ${claimUrl}`;
  await client.messages.create({ messagingServiceSid: MESSAGING_SERVICE_SID, to, body });
}

export async function sendStickerSMS(params: {
  to: string;
  senderName: string;
  claimToken: string;
  businessName?: string;
}) {
  const { to, senderName, claimToken, businessName } = params;
  const claimUrl = `https://fraise.box/claim/${claimToken}`;
  const stickerLabel = businessName ? `a ${businessName} sticker` : 'a strawberry sticker';

  const body = `${senderName} sent you ${stickerLabel} on Box Fraise 🍓\n\nClaim it: ${claimUrl}`;

  await client.messages.create({
    messagingServiceSid: MESSAGING_SERVICE_SID,
    to,
    body,
  });
}
